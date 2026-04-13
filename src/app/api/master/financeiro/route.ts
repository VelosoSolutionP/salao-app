import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const ano = parseInt(searchParams.get("ano") ?? String(new Date().getFullYear()));

  // Pagamentos por mês no ano
  const meses = await Promise.all(
    Array.from({ length: 12 }, async (_, i) => {
      const inicio = new Date(ano, i, 1);
      const fim = new Date(ano, i + 1, 0, 23, 59, 59);
      const [receita, gastos] = await Promise.all([
        prisma.pagamentoContrato.aggregate({
          _sum: { valor: true },
          where: { pago: true, pagoEm: { gte: inicio, lte: fim } },
        }),
        prisma.gastoPlataforma.aggregate({
          _sum: { valor: true },
          where: { data: { gte: inicio, lte: fim } },
        }),
      ]);
      return {
        mes: inicio.toLocaleString("pt-BR", { month: "short" }),
        receita: Number(receita._sum.valor ?? 0),
        gastos: Number(gastos._sum.valor ?? 0),
        lucro: Number(receita._sum.valor ?? 0) - Number(gastos._sum.valor ?? 0),
      };
    })
  );

  const [contratos, gastos, totalReceita, totalGastos] = await Promise.all([
    prisma.contratoSalao.findMany({
      where: { ativo: true },
      include: { salon: { select: { id: true, name: true, city: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.gastoPlataforma.findMany({
      orderBy: { data: "desc" },
      take: 50,
    }),
    prisma.pagamentoContrato.aggregate({
      _sum: { valor: true },
      where: {
        pago: true,
        pagoEm: {
          gte: new Date(ano, 0, 1),
          lte: new Date(ano, 11, 31, 23, 59, 59),
        },
      },
    }),
    prisma.gastoPlataforma.aggregate({
      _sum: { valor: true },
      where: {
        data: {
          gte: new Date(ano, 0, 1),
          lte: new Date(ano, 11, 31, 23, 59, 59),
        },
      },
    }),
  ]);

  return NextResponse.json({
    meses,
    contratos,
    gastos,
    resumoAno: {
      receita: Number(totalReceita._sum.valor ?? 0),
      gastos: Number(totalGastos._sum.valor ?? 0),
      lucro: Number(totalReceita._sum.valor ?? 0) - Number(totalGastos._sum.valor ?? 0),
    },
  });
}
