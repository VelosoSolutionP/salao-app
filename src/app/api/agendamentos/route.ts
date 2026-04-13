export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireSalon } from "@/lib/auth-guard";
import { redis, CK, invalidateCache } from "@/lib/redis";
import { queueSSEEvent } from "@/lib/sse";
import { addMinutes } from "date-fns";
import { Ratelimit } from "@upstash/ratelimit";

const createSchema = z.object({
  colaboradorId: z.string(),
  servicoIds: z.array(z.string()).min(1),
  data: z.string(), // YYYY-MM-DD
  hora: z.string(), // HH:mm
  observacoes: z.string().optional(),
  clienteId: z.string().optional(),
  clienteNome: z.string().optional(), // walk-in name when no registered client
});

const useRatelimit = !!process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://");
const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1 m"),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const colaboradorId = searchParams.get("colaboradorId");
  const clienteId = searchParams.get("clienteId");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");

  const where: Record<string, unknown> = { salonId: salonId! };

  if (status) where.status = status;
  if (colaboradorId) where.colaboradorId = colaboradorId;
  if (clienteId) where.clienteId = clienteId;

  if (session!.user.role === "CLIENT") {
    const cliente = await prisma.cliente.findUnique({
      where: { userId: session!.user.id },
    });
    if (cliente) where.clienteId = cliente.id;
  }

  if (dataInicio || dataFim) {
    where.inicio = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim ? { lte: new Date(dataFim + "T23:59:59") } : {}),
    };
  }

  const agendamentos = await prisma.agendamento.findMany({
    where,
    include: {
      cliente: { include: { user: { select: { name: true, phone: true } } } },
      colaborador: { include: { user: { select: { name: true, image: true } } } },
      servicos: { include: { servico: true } },
    },
    orderBy: { inicio: "asc" },
  });

  return NextResponse.json(agendamentos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  // Rate limit by user (only in production with Upstash)
  if (useRatelimit) {
    const { success } = await ratelimit.limit(session!.user.id);
    if (!success) {
      return NextResponse.json(
        { error: "Muitas requisições. Tente novamente em breve." },
        { status: 429 }
      );
    }
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { colaboradorId, servicoIds, data, hora, observacoes, clienteId } =
    parsed.data;

  // Determine clienteId
  let resolvedClienteId: string | null = clienteId ?? null;
  if (session!.user.role === "CLIENT") {
    const cliente = await prisma.cliente.findUnique({
      where: { userId: session!.user.id },
    });
    if (!cliente) {
      return NextResponse.json({ error: "Perfil de cliente não encontrado" }, { status: 404 });
    }
    resolvedClienteId = cliente.id;
  }

  // Get services and calculate total duration/price
  const servicos = await prisma.servico.findMany({
    where: { id: { in: servicoIds }, salonId: salonId!, ativo: true },
  });

  if (servicos.length !== servicoIds.length) {
    return NextResponse.json({ error: "Um ou mais serviços inválidos" }, { status: 400 });
  }

  const duracaoTotal = servicos.reduce((acc, s) => acc + s.duracao, 0);
  const totalPrice = servicos.reduce((acc, s) => acc + Number(s.preco), 0);

  const inicio = new Date(`${data}T${hora}:00`);
  const fim = addMinutes(inicio, duracaoTotal);

  // Acquire Redis distributed lock to prevent double-booking
  const lockKey = `lock:collab:${colaboradorId}:${data}:${hora}`;
  const lock = await redis.set(lockKey, "1", { nx: true, ex: 10 });

  if (!lock) {
    return NextResponse.json(
      { error: "Horário em processo de reserva. Tente novamente." },
      { status: 409 }
    );
  }

  try {
    // Check for conflicts in DB
    const conflict = await prisma.agendamento.findFirst({
      where: {
        colaboradorId,
        status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
        OR: [
          { inicio: { lt: fim }, fim: { gt: inicio } },
        ],
      },
    });

    if (conflict) {
      return NextResponse.json(
        { error: "Horário não disponível" },
        { status: 409 }
      );
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        salonId: salonId!,
        clienteId: resolvedClienteId ?? undefined,
        colaboradorId,
        inicio,
        fim,
        totalPrice,
        observacoes,
        servicos: {
          create: servicos.map((s) => ({
            servicoId: s.id,
            preco: s.preco,
            duracao: s.duracao,
          })),
        },
      },
      include: {
        cliente: { include: { user: { select: { name: true, phone: true } } } },
        colaborador: { include: { user: { select: { name: true } } } },
        servicos: { include: { servico: true } },
      },
    });

    // Update client stats (only if a client was linked)
    if (resolvedClienteId) {
      await prisma.cliente.update({
        where: { id: resolvedClienteId },
        data: {
          totalVisitas: { increment: 1 },
          ultimaVisita: inicio,
        },
      });
    }

    // Invalidate availability cache
    await invalidateCache(
      CK.SLOTS(colaboradorId, data),
      CK.RELATORIO(salonId!, "agendamentos", "hoje")
    );

    // Broadcast SSE event
    await queueSSEEvent(salonId!, {
      type: "appointment.created",
      data: { id: agendamento.id, inicio: inicio.toISOString() },
    });

    return NextResponse.json(agendamento, { status: 201 });
  } finally {
    await redis.del(lockKey);
  }
}
