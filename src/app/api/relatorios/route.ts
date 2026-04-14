export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { redis, CK, TTL } from "@/lib/redis";
import { startOfMonth, endOfMonth, eachDayOfInterval, format, subMonths } from "date-fns";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const tipo = searchParams.get("tipo") ?? "agendamentos"; // agendamentos | clientes | ocupacao | produtividade
  const mes = searchParams.get("mes") ?? format(new Date(), "yyyy-MM");

  const cacheKey = CK.RELATORIO(salonId!, tipo, mes);
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [year, month] = mes.split("-").map(Number);
  const dataInicio = startOfMonth(new Date(year, month - 1));
  const dataFim = endOfMonth(new Date(year, month - 1));
  const mesAnteriorInicio = startOfMonth(subMonths(new Date(year, month - 1), 1));
  const mesAnteriorFim = endOfMonth(subMonths(new Date(year, month - 1), 1));

  let result: Record<string, unknown> = {};

  if (tipo === "agendamentos") {
    const dias = eachDayOfInterval({ start: dataInicio, end: dataFim });

    const [agendamentos, receitaAgg] = await Promise.all([
      prisma.agendamento.findMany({
        where: { salonId: salonId!, inicio: { gte: dataInicio, lte: dataFim } },
        select: { inicio: true, status: true },
      }),
      prisma.transacao.aggregate({
        where: {
          salonId: salonId!,
          tipo: "RECEITA",
          dataTransacao: { gte: dataInicio, lte: dataFim },
        },
        _sum: { valor: true },
      }),
    ]);

    const porDia = dias.map((dia) => {
      const diaStr = format(dia, "yyyy-MM-dd");
      const dosDia = agendamentos.filter(
        (a) => format(a.inicio, "yyyy-MM-dd") === diaStr
      );
      return {
        data: format(dia, "dd/MM"),
        total: dosDia.length,
        concluidos: dosDia.filter((a) => a.status === "CONCLUIDO").length,
        cancelados: dosDia.filter((a) => a.status === "CANCELADO").length,
      };
    });

    const statusCount = agendamentos.reduce(
      (acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; },
      {} as Record<string, number>
    );

    const totalReceita = Number(receitaAgg._sum.valor ?? 0);
    const totalConcluidos = agendamentos.filter((a) => a.status === "CONCLUIDO").length;
    const ticketMedio = totalConcluidos > 0 ? totalReceita / totalConcluidos : 0;

    result = {
      porDia, statusCount,
      total: agendamentos.length,
      totalReceita, ticketMedio,
      totalConcluidos,
      totalCancelados: agendamentos.filter((a) => a.status === "CANCELADO").length,
    };
  }

  if (tipo === "clientes") {
    const [novos, recorrentes, topClientes] = await Promise.all([
      prisma.cliente.count({
        where: { salonId: salonId!, createdAt: { gte: dataInicio, lte: dataFim } },
      }),
      prisma.cliente.count({
        where: { salonId: salonId!, totalVisitas: { gt: 1 }, ultimaVisita: { gte: dataInicio, lte: dataFim } },
      }),
      prisma.cliente.findMany({
        where: { salonId: salonId! },
        orderBy: { totalGasto: "desc" },
        take: 10,
        include: { user: { select: { name: true } } },
      }),
    ]);
    result = { novos, recorrentes, topClientes };
  }

  if (tipo === "ocupacao" || tipo === "produtividade") {
    const colaboradores = await prisma.colaborador.findMany({
      where: { salonId: salonId!, active: true },
      include: { user: { select: { name: true, image: true } } },
    });

    const ocupacao = await Promise.all(
      colaboradores.map(async (c) => {
        const [agTotal, agConcluidos, agCancelados, receitaAgg, receitaMesAntAgg, comissoesAgg, topServicos] =
          await Promise.all([
            prisma.agendamento.count({
              where: { colaboradorId: c.id, inicio: { gte: dataInicio, lte: dataFim } },
            }),
            prisma.agendamento.count({
              where: { colaboradorId: c.id, inicio: { gte: dataInicio, lte: dataFim }, status: "CONCLUIDO" },
            }),
            prisma.agendamento.count({
              where: { colaboradorId: c.id, inicio: { gte: dataInicio, lte: dataFim }, status: { in: ["CANCELADO", "NAO_COMPARECEU"] } },
            }),
            prisma.transacao.aggregate({
              where: {
                salonId: salonId!,
                tipo: "RECEITA",
                agendamento: { colaboradorId: c.id, inicio: { gte: dataInicio, lte: dataFim } },
              },
              _sum: { valor: true },
            }),
            prisma.transacao.aggregate({
              where: {
                salonId: salonId!,
                tipo: "RECEITA",
                agendamento: { colaboradorId: c.id, inicio: { gte: mesAnteriorInicio, lte: mesAnteriorFim } },
              },
              _sum: { valor: true },
            }),
            prisma.comissaoColaborador.aggregate({
              where: { colaboradorId: c.id, createdAt: { gte: dataInicio, lte: dataFim } },
              _sum: { valor: true },
            }),
            prisma.agendamentoServico.groupBy({
              by: ["servicoId"],
              where: {
                agendamento: { colaboradorId: c.id, inicio: { gte: dataInicio, lte: dataFim }, status: "CONCLUIDO" },
              },
              _count: true,
              orderBy: { _count: { servicoId: "desc" } },
              take: 3,
            }),
          ]);

        const receita = Number(receitaAgg._sum.valor ?? 0);
        const receitaMesAnt = Number(receitaMesAntAgg._sum.valor ?? 0);
        const variacaoReceita = receitaMesAnt > 0
          ? ((receita - receitaMesAnt) / receitaMesAnt) * 100
          : 0;

        const servicoIds = topServicos.map((s) => s.servicoId);
        const servicos = servicoIds.length > 0
          ? await prisma.servico.findMany({ where: { id: { in: servicoIds } }, select: { id: true, nome: true } })
          : [];

        return {
          colaboradorId: c.id,
          nome: c.user.name,
          image: c.user.image,
          agendamentos: agTotal,
          concluidos: agConcluidos,
          cancelados: agCancelados,
          taxaConclusao: agTotal > 0 ? Math.round((agConcluidos / agTotal) * 100) : 0,
          receita,
          receitaMesAnt,
          variacaoReceita,
          ticketMedio: agConcluidos > 0 ? receita / agConcluidos : 0,
          comissao: Number(comissoesAgg._sum.valor ?? 0),
          percentualComissao: Number(c.comissao) * 100,
          topServicos: topServicos.map((s) => ({
            servicoId: s.servicoId,
            nome: servicos.find((sv) => sv.id === s.servicoId)?.nome ?? "—",
            count: s._count,
          })),
        };
      })
    );

    // Sort by revenue desc
    ocupacao.sort((a, b) => b.receita - a.receita);
    result = { ocupacao };
  }

  await redis.set(cacheKey, result, { ex: TTL.RELATORIOS });
  return NextResponse.json(result);
}
