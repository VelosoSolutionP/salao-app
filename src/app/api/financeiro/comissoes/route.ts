export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const colaboradorId = searchParams.get("colaboradorId");
  const pago = searchParams.get("pago"); // "true" | "false" | null
  const mes = searchParams.get("mes"); // yyyy-MM

  const where: Record<string, unknown> = { salonId };
  if (colaboradorId) where.colaboradorId = colaboradorId;
  if (pago !== null) where.pago = pago === "true";
  if (mes) {
    const [y, m] = mes.split("-").map(Number);
    const inicio = new Date(y, m - 1, 1);
    const fim = new Date(y, m, 0, 23, 59, 59);
    where.createdAt = { gte: inicio, lte: fim };
  }

  const comissoes = await prisma.comissaoColaborador.findMany({
    where,
    include: {
      colaborador: { include: { user: { select: { name: true, image: true } } } },
      agendamento: {
        include: {
          servicos: { include: { servico: { select: { nome: true } } } },
          cliente: { include: { user: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Aggregations per colaborador
  const porColaborador = await prisma.comissaoColaborador.groupBy({
    by: ["colaboradorId"],
    where: { salonId },
    _sum: { valor: true },
    _count: true,
  });

  const pendente = await prisma.comissaoColaborador.aggregate({
    where: { salonId, pago: false },
    _sum: { valor: true },
  });

  const pago2 = await prisma.comissaoColaborador.aggregate({
    where: { salonId, pago: true },
    _sum: { valor: true },
  });

  return NextResponse.json({
    comissoes,
    totalPendente: Number(pendente._sum.valor ?? 0),
    totalPago: Number(pago2._sum.valor ?? 0),
    porColaborador,
  });
}
