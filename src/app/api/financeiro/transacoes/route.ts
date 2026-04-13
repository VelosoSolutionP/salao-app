export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";

const createSchema = z.object({
  tipo: z.enum(["RECEITA", "DESPESA"]),
  descricao: z.string().min(1),
  valor: z.number().positive(),
  metodo: z
    .enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "TRANSFERENCIA"])
    .optional(),
  categoria: z.string().optional(),
  dataTransacao: z.string().datetime().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const tipo = searchParams.get("tipo");
  const categoria = searchParams.get("categoria");
  const dataInicio = searchParams.get("dataInicio");
  const dataFim = searchParams.get("dataFim");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const where: Record<string, unknown> = { salonId: salonId! };
  if (tipo) where.tipo = tipo;
  if (categoria) where.categoria = { contains: categoria, mode: "insensitive" };
  if (dataInicio || dataFim) {
    where.dataTransacao = {
      ...(dataInicio ? { gte: new Date(dataInicio) } : {}),
      ...(dataFim ? { lte: new Date(dataFim + "T23:59:59") } : {}),
    };
  }

  const [transacoes, total] = await Promise.all([
    prisma.transacao.findMany({
      where,
      include: { agendamento: { select: { id: true } } },
      orderBy: { dataTransacao: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transacao.count({ where }),
  ]);

  return NextResponse.json({ transacoes, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const transacao = await prisma.transacao.create({
    data: {
      salonId: salonId!,
      ...parsed.data,
      dataTransacao: parsed.data.dataTransacao
        ? new Date(parsed.data.dataTransacao)
        : new Date(),
    },
  });

  await invalidateCache(
    CK.RELATORIO(salonId!, "financeiro", "hoje"),
    CK.RELATORIO(salonId!, "financeiro", "semana"),
    CK.RELATORIO(salonId!, "financeiro", "mes"),
    CK.RELATORIO(salonId!, "financeiro", "ano"),
  );

  return NextResponse.json(transacao, { status: 201 });
}
