import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import {
  startOfMonth, endOfMonth, startOfDay, endOfDay,
} from "date-fns";

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  logoUrl: z.string().url().optional(),
  addSalonIds: z.array(z.string()).optional(),
  removeSalonIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const rede = await prisma.rede.findFirst({
    where: { id, ownerId: session!.user.id },
    include: {
      salons: {
        select: { id: true, name: true, city: true, logoUrl: true, active: true },
      },
    },
  });

  if (!rede) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Fetch consolidated metrics
  const salonIds = rede.salons.map((s) => s.id);
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  const [receitaMesAgg, agendamentosHojeCount, agendamentosMesCount, clientesTotalCount] =
    await Promise.all([
      prisma.transacao.aggregate({
        where: { salonId: { in: salonIds }, tipo: "RECEITA", dataTransacao: { gte: monthStart, lte: monthEnd } },
        _sum: { valor: true },
      }),
      prisma.agendamento.count({
        where: { salonId: { in: salonIds }, inicio: { gte: todayStart, lte: todayEnd }, status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] } },
      }),
      prisma.agendamento.count({
        where: { salonId: { in: salonIds }, inicio: { gte: monthStart, lte: monthEnd }, status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] } },
      }),
      prisma.cliente.count({
        where: { salonId: { in: salonIds } },
      }),
    ]);

  // Per-salon metrics
  const salonMetrics = await Promise.all(
    rede.salons.map(async (salon) => {
      const [receitaMes, agendamentosHoje, agendamentosMes, clientes] = await Promise.all([
        prisma.transacao.aggregate({
          where: { salonId: salon.id, tipo: "RECEITA", dataTransacao: { gte: monthStart, lte: monthEnd } },
          _sum: { valor: true },
        }),
        prisma.agendamento.count({
          where: { salonId: salon.id, inicio: { gte: todayStart, lte: todayEnd }, status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] } },
        }),
        prisma.agendamento.count({
          where: { salonId: salon.id, inicio: { gte: monthStart, lte: monthEnd }, status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] } },
        }),
        prisma.cliente.count({ where: { salonId: salon.id } }),
      ]);
      return {
        ...salon,
        receitaMes: Number(receitaMes._sum.valor ?? 0),
        agendamentosHoje,
        agendamentosMes,
        clientes,
      };
    })
  );

  return NextResponse.json({
    ...rede,
    metrics: {
      receitaMes: Number(receitaMesAgg._sum.valor ?? 0),
      agendamentosHoje: agendamentosHojeCount,
      agendamentosMes: agendamentosMesCount,
      clientesTotal: clientesTotalCount,
    },
    salonMetrics,
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const existing = await prisma.rede.findFirst({ where: { id, ownerId: session!.user.id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });
  }

  const { addSalonIds, removeSalonIds, ...data } = parsed.data;

  const updated = await prisma.rede.update({
    where: { id },
    data: {
      ...data,
      ...(addSalonIds?.length ? { salons: { connect: addSalonIds.map((sid) => ({ id: sid })) } } : {}),
      ...(removeSalonIds?.length ? { salons: { disconnect: removeSalonIds.map((sid) => ({ id: sid })) } } : {}),
    },
    include: { salons: { select: { id: true, name: true, city: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const existing = await prisma.rede.findFirst({ where: { id, ownerId: session!.user.id } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.rede.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
