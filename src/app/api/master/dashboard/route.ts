import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [
    totalSaloes,
    saloesTrial,
    saloesAtivos,
    saloesBloqueados,
    totalOwners,
    saloesRecentes,
    // financial
    mrrAtual,
    gastosMes,
    gastosUltimoMes,
    pagamentosRecentes,
  ] = await Promise.all([
    prisma.salon.count(),
    prisma.user.count({ where: { role: "OWNER", trialExpires: { gt: now } } }),
    prisma.user.count({ where: { role: "OWNER", blocked: false, OR: [{ trialExpires: null }, { trialExpires: { gt: now } }] } }),
    prisma.user.count({ where: { role: "OWNER", blocked: true } }),
    prisma.user.count({ where: { role: "OWNER" } }),
    prisma.salon.findMany({
      take: 12,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true, blocked: true, trialExpires: true } },
        contratos: { where: { ativo: true }, select: { valorMensal: true } },
      },
    }),
    // MRR = soma dos contratos ativos
    prisma.contratoSalao.aggregate({
      _sum: { valorMensal: true },
      where: { ativo: true },
    }),
    // Gastos do mês atual
    prisma.gastoPlataforma.aggregate({
      _sum: { valor: true },
      where: { data: { gte: startOfMonth } },
    }),
    // Gastos do mês passado
    prisma.gastoPlataforma.aggregate({
      _sum: { valor: true },
      where: { data: { gte: startOfLastMonth, lte: endOfLastMonth } },
    }),
    // Pagamentos recentes
    prisma.pagamentoContrato.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      where: { pago: true },
      include: { contrato: { include: { salon: { select: { name: true } } } } },
    }),
  ]);

  // Crescimento mês a mês (últimos 6 meses)
  const crescimento = await Promise.all(
    Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const end = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 0);
      return prisma.salon.count({ where: { createdAt: { gte: d, lte: end } } }).then((count) => ({
        mes: d.toLocaleString("pt-BR", { month: "short", year: "2-digit" }),
        saloes: count,
      }));
    })
  );

  const mrr = Number(mrrAtual._sum.valorMensal ?? 0);
  const gastos = Number(gastosMes._sum.valor ?? 0);
  const gastosAnterior = Number(gastosUltimoMes._sum.valor ?? 0);

  return NextResponse.json({
    kpis: {
      totalSaloes,
      saloesTrial,
      saloesAtivos,
      saloesBloqueados,
      totalOwners,
      mrr,
      gastosMes: gastos,
      lucroBruto: mrr - gastos,
      gastosVariacao: gastosAnterior > 0 ? ((gastos - gastosAnterior) / gastosAnterior) * 100 : 0,
    },
    crescimento,
    saloesRecentes,
    pagamentosRecentes,
  });
}
