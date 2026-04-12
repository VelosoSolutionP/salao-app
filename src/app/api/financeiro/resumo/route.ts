export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { redis, CK, TTL } from "@/lib/redis";
import { startOfMonth, endOfMonth, startOfDay, endOfDay, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  try {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const periodo = searchParams.get("periodo") ?? "mes"; // hoje | semana | mes | ano

  const cacheKey = CK.RELATORIO(salonId!, "financeiro", periodo);
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const now = new Date();
  let dataInicio: Date;
  let dataFim: Date;

  switch (periodo) {
    case "hoje":
      dataInicio = startOfDay(now);
      dataFim = endOfDay(now);
      break;
    case "semana":
      dataInicio = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      dataFim = endOfDay(now);
      break;
    case "ano":
      dataInicio = new Date(now.getFullYear(), 0, 1);
      dataFim = endOfDay(now);
      break;
    default:
      dataInicio = startOfMonth(now);
      dataFim = endOfMonth(now);
  }

  const [receitas, despesas, receitaMesAnterior, agendamentosCount] =
    await Promise.all([
      prisma.transacao.aggregate({
        where: {
          salonId: salonId!,
          tipo: "RECEITA",
          dataTransacao: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.transacao.aggregate({
        where: {
          salonId: salonId!,
          tipo: "DESPESA",
          dataTransacao: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.transacao.aggregate({
        where: {
          salonId: salonId!,
          tipo: "RECEITA",
          dataTransacao: {
            gte: startOfMonth(subMonths(now, 1)),
            lte: endOfMonth(subMonths(now, 1)),
          },
        },
        _sum: { valor: true },
      }),
      prisma.agendamento.count({
        where: {
          salonId: salonId!,
          inicio: { gte: dataInicio, lte: dataFim },
          status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
        },
      }),
    ]);

  // Revenue by service category
  const receitaPorServico = await prisma.agendamentoServico.groupBy({
    by: ["servicoId"],
    where: {
      agendamento: {
        salonId: salonId!,
        inicio: { gte: dataInicio, lte: dataFim },
        status: "CONCLUIDO",
      },
    },
    _sum: { preco: true },
    _count: true,
  });

  const servicosDetalhes = await prisma.servico.findMany({
    where: { id: { in: receitaPorServico.map((r) => r.servicoId) } },
    select: { id: true, nome: true, categoria: true },
  });

  const totalReceita = Number(receitas._sum.valor ?? 0);
  const totalDespesa = Number(despesas._sum.valor ?? 0);
  const mesAnterior = Number(receitaMesAnterior._sum.valor ?? 0);
  const variacao = mesAnterior > 0 ? ((totalReceita - mesAnterior) / mesAnterior) * 100 : 0;

  const result = {
    totalReceita,
    totalDespesa,
    lucro: totalReceita - totalDespesa,
    variacao,
    agendamentosCount,
    receitaPorServico: receitaPorServico.map((r) => {
      const servico = servicosDetalhes.find((s) => s.id === r.servicoId);
      return {
        servicoId: r.servicoId,
        nome: servico?.nome ?? "Desconhecido",
        categoria: servico?.categoria,
        total: Number(r._sum.preco ?? 0),
        count: r._count,
      };
    }),
    periodo,
  };

  await redis.set(cacheKey, result, { ex: TTL.RELATORIOS });

  return NextResponse.json(result);
  } catch (err) {
    console.error("[financeiro/resumo] erro interno:", err);
    return NextResponse.json({ error: "Erro interno ao calcular resumo" }, { status: 500 });
  }
}
