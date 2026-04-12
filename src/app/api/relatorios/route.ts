import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { redis, CK, TTL } from "@/lib/redis";
import { startOfMonth, endOfMonth, eachDayOfInterval, format } from "date-fns";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const tipo = searchParams.get("tipo") ?? "agendamentos"; // agendamentos | clientes | ocupacao
  const mes = searchParams.get("mes") ?? format(new Date(), "yyyy-MM");

  const cacheKey = CK.RELATORIO(salonId!, tipo, mes);
  const cached = await redis.get(cacheKey);
  if (cached) return NextResponse.json(cached);

  const [year, month] = mes.split("-").map(Number);
  const dataInicio = startOfMonth(new Date(year, month - 1));
  const dataFim = endOfMonth(new Date(year, month - 1));

  let result: Record<string, unknown> = {};

  if (tipo === "agendamentos") {
    const dias = eachDayOfInterval({ start: dataInicio, end: dataFim });

    const [agendamentos, receitaAgg] = await Promise.all([
      prisma.agendamento.findMany({
        where: {
          salonId: salonId!,
          inicio: { gte: dataInicio, lte: dataFim },
        },
        select: { inicio: true, status: true },
      }),
      prisma.transacao.aggregate({
        where: {
          salonId: salonId!,
          tipo: "RECEITA",
          createdAt: { gte: dataInicio, lte: dataFim },
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
      (acc, a) => {
        acc[a.status] = (acc[a.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const totalReceita = Number(receitaAgg._sum.valor ?? 0);
    const totalConcluidos = agendamentos.filter((a) => a.status === "CONCLUIDO").length;
    const ticketMedio = totalConcluidos > 0 ? totalReceita / totalConcluidos : 0;

    result = {
      porDia,
      statusCount,
      total: agendamentos.length,
      totalReceita,
      ticketMedio,
      totalConcluidos,
      totalCancelados: agendamentos.filter((a) => a.status === "CANCELADO").length,
    };
  }

  if (tipo === "clientes") {
    const [novos, recorrentes, topClientes] = await Promise.all([
      prisma.cliente.count({
        where: {
          salonId: salonId!,
          createdAt: { gte: dataInicio, lte: dataFim },
        },
      }),
      prisma.cliente.count({
        where: {
          salonId: salonId!,
          totalVisitas: { gt: 1 },
          ultimaVisita: { gte: dataInicio, lte: dataFim },
        },
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

  if (tipo === "ocupacao") {
    const colaboradores = await prisma.colaborador.findMany({
      where: { salonId: salonId!, active: true },
      include: { user: { select: { name: true } } },
    });

    const ocupacao = await Promise.all(
      colaboradores.map(async (c) => {
        const total = await prisma.agendamento.count({
          where: {
            colaboradorId: c.id,
            inicio: { gte: dataInicio, lte: dataFim },
            status: { notIn: ["CANCELADO"] },
          },
        });
        const receita = await prisma.transacao.aggregate({
          where: {
            salonId: salonId!,
            agendamento: {
              colaboradorId: c.id,
              inicio: { gte: dataInicio, lte: dataFim },
            },
            tipo: "RECEITA",
          },
          _sum: { valor: true },
        });
        return {
          colaboradorId: c.id,
          nome: c.user.name,
          agendamentos: total,
          receita: Number(receita._sum.valor ?? 0),
          comissao: Number(c.comissao) * Number(receita._sum.valor ?? 0),
        };
      })
    );

    result = { ocupacao };
  }

  await redis.set(cacheKey, result, { ex: TTL.RELATORIOS });

  return NextResponse.json(result);
}
