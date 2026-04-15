import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardProfissional } from "@/components/dashboard/DashboardProfissional";
import type { ReceitaDiariaItem, TopServicoItem } from "@/components/dashboard/DashboardProfissional";
import { ArrowRight } from "lucide-react";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  startOfWeek,
  endOfWeek,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";

export const metadata: Metadata = { title: "Dashboard — Hera" };

// ─── Greeting helper ─────────────────────────────────────────────────────────

function buildGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bom dia, ${name}!`;
  if (h < 18) return `Boa tarde, ${name}!`;
  return `Boa noite, ${name}!`;
}

// ─── Raw query result types ──────────────────────────────────────────────────

interface RawReceitaDiaria {
  date: string;
  total: number | string;
  day_date: Date | string;
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const session = await auth();
  const salonId = session?.user.salonId ?? null;
  const userName = session?.user.name ?? "gestor";
  const firstName = userName.split(" ")[0];

  // ── No salon configured ──────────────────────────────────────────────────
  if (!salonId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mb-4">
          <span className="text-4xl">✂️</span>
        </div>
        <h2 className="text-xl font-black text-gray-900">
          Salão não configurado
        </h2>
        <p className="text-gray-400 text-sm mt-2 max-w-xs">
          Configure seu salão para começar a usar o sistema.
        </p>
        <Link
          href="/configuracoes"
          className="mt-6 inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
        >
          Configurar agora <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));
  const yesterdayEnd = endOfDay(subDays(now, 1));
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekStart = startOfWeek(now, { locale: ptBR });
  const weekEnd = endOfWeek(now, { locale: ptBR });

  // ── Parallel data fetching ───────────────────────────────────────────────
  const [
    receitaHojeAgg,
    receitaOntemAgg,
    receitaMesAgg,
    agendamentosHoje,
    agendamentosMesCount,
    colaboradoresAtivos,
    receitaDiariaRaw,
    produtosBaixoEstoqueCount,
    pendentesCount,
    clientesComAniversario,
    clientesTotal,
    clientesNovosMes,
    comissoesPendentesAgg,
    topServicosRaw,
  ] = await Promise.all([
    // 1. Receita hoje
    prisma.transacao.aggregate({
      where: {
        salonId,
        tipo: "RECEITA",
        dataTransacao: { gte: todayStart, lte: todayEnd },
      },
      _sum: { valor: true },
    }),

    // 2. Receita ontem
    prisma.transacao.aggregate({
      where: {
        salonId,
        tipo: "RECEITA",
        dataTransacao: { gte: yesterdayStart, lte: yesterdayEnd },
      },
      _sum: { valor: true },
    }),

    // 3. Receita do mês
    prisma.transacao.aggregate({
      where: {
        salonId,
        tipo: "RECEITA",
        dataTransacao: { gte: monthStart, lte: monthEnd },
      },
      _sum: { valor: true },
    }),

    // 4. Agendamentos de hoje com relações
    prisma.agendamento.findMany({
      where: {
        salonId,
        inicio: { gte: todayStart, lte: todayEnd },
      },
      include: {
        cliente: {
          include: { user: { select: { name: true, phone: true } } },
        },
        colaborador: {
          include: { user: { select: { name: true, image: true } } },
        },
        servicos: { include: { servico: { select: { nome: true } } } },
      },
      orderBy: { inicio: "asc" },
    }),

    // 5. Agendamentos do mês (count, não cancelados)
    prisma.agendamento.count({
      where: {
        salonId,
        inicio: { gte: monthStart, lte: monthEnd },
        status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
      },
    }),

    // 6. Colaboradores ativos com agendamentos de hoje
    prisma.colaborador.findMany({
      where: { salonId, active: true },
      include: {
        user: { select: { name: true, image: true, role: true } },
        agendamentos: {
          where: {
            inicio: { gte: todayStart, lte: todayEnd },
            status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
          },
          include: {
            transacao: { select: { valor: true } },
          },
        },
      },
    }),

    // 7. Receita diária — últimos 30 dias via raw SQL
    // Colunas em camelCase (Prisma 7 não converte para snake_case no PostgreSQL adapter)
    prisma.$queryRaw<RawReceitaDiaria[]>`
      SELECT
        TO_CHAR("dataTransacao", 'DD/MM') AS date,
        DATE("dataTransacao")             AS day_date,
        COALESCE(SUM(CAST(valor AS DECIMAL)), 0) AS total
      FROM transacoes
      WHERE "salonId" = ${salonId}
        AND tipo = 'RECEITA'
        AND "dataTransacao" >= NOW() - INTERVAL '30 days'
      GROUP BY DATE("dataTransacao"), TO_CHAR("dataTransacao", 'DD/MM')
      ORDER BY DATE("dataTransacao")
    `,

    // 8. Produtos com estoque baixo
    prisma.produto
      .count({
        where: {
          salonId,
          ativo: true,
        },
      })
      .then(async () => {
        const ps = await prisma.produto.findMany({
          where: { salonId, ativo: true },
          select: { estoque: true, estoqueMin: true },
        });
        return ps.filter((p) => p.estoque <= p.estoqueMin).length;
      }),

    // 9. Agendamentos pendentes (total, não só hoje)
    prisma.agendamento.count({
      where: { salonId, status: "PENDENTE" },
    }),

    // 10. Aniversariantes desta semana
    prisma.cliente.findMany({
      where: {
        salonId,
        dataNasc: { not: null },
      },
      select: { dataNasc: true },
    }),

    // 11. Total de clientes
    prisma.cliente.count({ where: { salonId } }),

    // 12. Clientes novos este mês
    prisma.cliente.count({
      where: { salonId, createdAt: { gte: monthStart, lte: monthEnd } },
    }),

    // 13. Comissões de colaboradores pendentes
    prisma.comissaoColaborador.aggregate({
      where: { salonId, pago: false },
      _sum: { valor: true },
    }),

    // 14. Top 5 serviços do mês
    prisma.agendamentoServico.groupBy({
      by: ["servicoId"],
      where: {
        agendamento: {
          salonId,
          inicio: { gte: monthStart, lte: monthEnd },
          status: "CONCLUIDO",
        },
      },
      _count: true,
      _sum: { preco: true },
      orderBy: { _count: { servicoId: "desc" } },
      take: 5,
    }),
  ]);

  // ── Post-process receita diária ─────────────────────────────────────────
  const todayFormatted = format(now, "dd/MM");

  const receitaDiaria: ReceitaDiariaItem[] = receitaDiariaRaw.map((row) => ({
    date: row.date,
    total: typeof row.total === "string" ? parseFloat(row.total) : Number(row.total),
    isToday: row.date === todayFormatted,
  }));

  // ── Post-process aniversariantes ────────────────────────────────────────
  const aniversariantes = clientesComAniversario.filter((c) => {
    if (!c.dataNasc) return false;
    const d = new Date(c.dataNasc);
    const m = d.getMonth() + 1;
    const day = d.getDate();
    // Check if birthday falls in current week
    const birthdayThisYear = new Date(now.getFullYear(), m - 1, day);
    return birthdayThisYear >= weekStart && birthdayThisYear <= weekEnd;
  }).length;

  // ── Post-process equipeHoje ─────────────────────────────────────────────
  const equipeHoje = colaboradoresAtivos.map((col) => {
    const receita = col.agendamentos.reduce((sum, ag) => {
      const v = ag.transacao?.valor;
      return sum + (v ? (typeof v === "string" ? parseFloat(v) : Number(v)) : 0);
    }, 0);

    return {
      id: col.id,
      nome: col.user.name,
      image: col.user.image,
      role: col.user.role === "BARBER" ? "Barbeiro / Cabeleireiro" : "Colaborador",
      agendamentos: col.agendamentos.length,
      receita,
    };
  });

  // Sort by revenue descending
  equipeHoje.sort((a, b) => b.receita - a.receita);

  // ── Post-process top serviços ──────────────────────────────────────────────
  const servicoIds = topServicosRaw.map((s) => s.servicoId);
  const servicosDetalhes = servicoIds.length > 0
    ? await prisma.servico.findMany({
        where: { id: { in: servicoIds } },
        select: { id: true, nome: true },
      })
    : [];

  const topServicos = topServicosRaw.map((s) => ({
    servicoId: s.servicoId,
    nome: servicosDetalhes.find((sv) => sv.id === s.servicoId)?.nome ?? "—",
    count: s._count,
    total: Number(s._sum.preco ?? 0),
  }));

  // ── Post-process agendamentos status breakdown ──────────────────────────
  const concluidos = agendamentosHoje.filter(
    (a) => a.status === "CONCLUIDO"
  ).length;
  const pendentes = agendamentosHoje.filter(
    (a) => a.status === "PENDENTE"
  ).length;
  const emAndamento = agendamentosHoje.filter(
    (a) => a.status === "EM_ANDAMENTO"
  ).length;
  const cancelados = agendamentosHoje.filter(
    (a) => a.status === "CANCELADO" || a.status === "NAO_COMPARECEU"
  ).length;

  // ── Scalar values ────────────────────────────────────────────────────────
  const receitaHoje = Number(receitaHojeAgg._sum.valor ?? 0);
  const receitaOntem = Number(receitaOntemAgg._sum.valor ?? 0);
  const receitaMes = Number(receitaMesAgg._sum.valor ?? 0);
  const comissoesPendentes = Number(comissoesPendentesAgg._sum.valor ?? 0);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <DashboardProfissional
      greeting={buildGreeting(firstName)}
      receitaHoje={receitaHoje}
      receitaOntem={receitaOntem}
      receitaMes={receitaMes}
      agendamentosHoje={agendamentosHoje}
      agendamentosHojeConcluidos={concluidos}
      agendamentosHojePendentes={pendentes}
      agendamentosHojeEmAndamento={emAndamento}
      agendamentosHojeCancelados={cancelados}
      agendamentosMes={agendamentosMesCount}
      equipeHoje={equipeHoje}
      receitaDiaria={receitaDiaria}
      produtosBaixoEstoque={produtosBaixoEstoqueCount}
      pendentesCount={pendentesCount}
      aniversariantes={aniversariantes}
      clientesTotal={clientesTotal}
      clientesNovosMes={clientesNovosMes}
      comissoesPendentes={comissoesPendentes}
      topServicos={topServicos}
    />
  );
}
