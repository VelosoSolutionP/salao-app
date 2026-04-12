"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn, formatBRL, formatTime, getInitials } from "@/lib/utils";
import {
  DollarSign, TrendingUp, TrendingDown, CalendarDays, Scissors,
  Package, Clock, Gift, CheckCircle, ArrowRight, Plus, Zap,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AgendamentoItem {
  id: string;
  inicio: Date;
  status: string;
  cliente: { user: { name: string; phone: string | null } } | null;
  colaborador: { id: string; user: { name: string; image: string | null } };
  servicos: Array<{ servico: { nome: string } }>;
}

export interface EquipeMembro {
  id: string;
  nome: string;
  image: string | null;
  role: string;
  agendamentos: number;
  receita: number;
}

export interface ReceitaDiariaItem {
  date: string;
  total: number;
  isToday?: boolean;
}

export interface DashboardProfissionalProps {
  greeting: string;
  receitaHoje: number;
  receitaOntem: number;
  receitaMes: number;
  agendamentosHoje: AgendamentoItem[];
  agendamentosHojeConcluidos: number;
  agendamentosHojePendentes: number;
  agendamentosHojeEmAndamento: number;
  agendamentosHojeCancelados: number;
  agendamentosMes: number;
  equipeHoje: EquipeMembro[];
  receitaDiaria: ReceitaDiariaItem[];
  produtosBaixoEstoque: number;
  pendentesCount: number;
  aniversariantes: number;
  clientesTotal: number;
}

// ─── Professional column colors ───────────────────────────────────────────────

const PROF_COLORS = [
  { header: "#f5f3ff", dot: "#7c3aed", text: "#5b21b6", ring: "#ddd6fe" },
  { header: "#eff6ff", dot: "#2563eb", text: "#1d4ed8", ring: "#bfdbfe" },
  { header: "#f0fdf4", dot: "#16a34a", text: "#15803d", ring: "#bbf7d0" },
  { header: "#fff7ed", dot: "#ea580c", text: "#c2410c", ring: "#fed7aa" },
  { header: "#fdf2f8", dot: "#db2777", text: "#be185d", ring: "#fbcfe8" },
  { header: "#fefce8", dot: "#ca8a04", text: "#a16207", ring: "#fef08a" },
];

// ─── Appointment status config ─────────────────────────────────────────────────

const APPT_STATUS: Record<string, {
  dot: string; label: string; badge: string; row: string; time: string;
}> = {
  PENDENTE:      { dot: "bg-amber-400",            label: "Pendente",      badge: "bg-amber-50 text-amber-600",   row: "",                    time: "text-amber-700" },
  CONFIRMADO:    { dot: "bg-blue-400",              label: "Confirmado",    badge: "bg-blue-50 text-blue-600",     row: "",                    time: "text-blue-700" },
  EM_ANDAMENTO:  { dot: "bg-violet-500 animate-pulse", label: "Ao vivo",  badge: "bg-violet-600 text-white",     row: "bg-violet-50/80",     time: "text-violet-700" },
  CONCLUIDO:     { dot: "bg-emerald-400",           label: "Concluído",    badge: "bg-emerald-50 text-emerald-600", row: "opacity-50",        time: "text-gray-400" },
  CANCELADO:     { dot: "bg-red-400",               label: "Cancelado",    badge: "bg-red-50 text-red-500",       row: "opacity-40 line-through", time: "text-gray-400" },
  NAO_COMPARECEU:{ dot: "bg-gray-300",              label: "Não veio",     badge: "bg-gray-100 text-gray-400",    row: "opacity-40",          time: "text-gray-400" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatMinutes(m: number): string {
  if (m === 0) return "Agora!";
  if (m < 60) return `em ${m}min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `em ${h}h${r}min` : `em ${h}h`;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: Array<{ value: number }>; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 text-white text-xs rounded-xl px-3 py-2 shadow-2xl border border-zinc-800">
      <p className="text-zinc-400 font-semibold mb-0.5">{label}</p>
      <p className="font-black text-sm">{formatBRL(payload[0].value)}</p>
    </div>
  );
}

// ─── ProfColumn sub-component ─────────────────────────────────────────────────

interface ProfColData {
  id: string;
  nome: string;
  image: string | null;
  agendamentosCount: number;
  receita: number;
  items: AgendamentoItem[];
}

function ProfColumn({
  col,
  colorIdx,
  nextApptId,
}: {
  col: ProfColData;
  colorIdx: number;
  nextApptId: string | null;
}) {
  const c = PROF_COLORS[colorIdx % PROF_COLORS.length];
  const inProgressNow = col.items.find((a) => a.status === "EM_ANDAMENTO");

  return (
    <div className="flex flex-col min-w-[240px] flex-1">
      {/* Header */}
      <div
        className="rounded-2xl p-4 mb-3 border"
        style={{ background: c.header, borderColor: c.ring }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <Avatar className="w-10 h-10">
              <AvatarFallback
                className="text-sm font-black"
                style={{ background: c.ring, color: c.text }}
              >
                {getInitials(col.nome)}
              </AvatarFallback>
            </Avatar>
            {inProgressNow && (
              <span
                className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white animate-pulse"
                style={{ background: c.dot }}
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-sm leading-tight truncate" style={{ color: c.text }}>
              {col.nome.split(" ")[0]}
            </p>
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {col.agendamentosCount} atendimento{col.agendamentosCount !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-black" style={{ color: c.text }}>
              {formatBRL(col.receita)}
            </p>
            <p className="text-[10px] text-gray-400">receita</p>
          </div>
        </div>
      </div>

      {/* Appointment cards */}
      <div className="flex flex-col gap-1.5 flex-1">
        {col.items.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 rounded-2xl border-2 border-dashed border-gray-100">
            <CalendarDays className="w-6 h-6 text-gray-200 mb-2" />
            <p className="text-xs text-gray-300 font-medium">Sem atendimentos</p>
          </div>
        ) : (
          col.items.map((ag) => {
            const s = APPT_STATUS[ag.status] ?? APPT_STATUS.PENDENTE;
            const isNext = ag.id === nextApptId;
            const isLive = ag.status === "EM_ANDAMENTO";

            return (
              <div
                key={ag.id}
                className={cn(
                  "rounded-xl px-3 py-2.5 border transition-all",
                  isLive
                    ? "border-violet-200 shadow-sm"
                    : isNext
                    ? "border-gray-200 shadow-sm"
                    : "border-gray-100",
                  s.row
                )}
                style={
                  isLive
                    ? { background: "linear-gradient(135deg,#f5f3ff,#ede9fe)" }
                    : isNext
                    ? { background: "#fafaf9" }
                    : { background: "white" }
                }
              >
                <div className="flex items-start gap-2.5">
                  {/* Status dot */}
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", s.dot)} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <p className={cn("text-xs font-black tabular-nums flex-shrink-0", s.time)}>
                        {formatTime(ag.inicio)}
                      </p>
                      {isLive && (
                        <span className="flex items-center gap-0.5 text-[9px] font-black bg-violet-600 text-white px-1.5 py-0.5 rounded-md">
                          <Zap className="w-2.5 h-2.5" />
                          AO VIVO
                        </span>
                      )}
                      {isNext && !isLive && (
                        <span className="text-[9px] font-black text-orange-500 bg-orange-50 px-1.5 py-0.5 rounded-md">
                          PRÓXIMO
                        </span>
                      )}
                      {!isLive && !isNext && (
                        <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-md", s.badge)}>
                          {s.label}
                        </span>
                      )}
                    </div>
                    <p className={cn(
                      "text-xs font-bold leading-tight mt-0.5",
                      ag.status === "CONCLUIDO" || ag.status === "CANCELADO" ? "text-gray-400" : "text-gray-900"
                    )}>
                      {ag.cliente?.user.name.split(" ")[0] ?? "Walk-in"}
                    </p>
                    <p className="text-[11px] text-gray-400 truncate mt-0.5">
                      {ag.servicos.map((sv) => sv.servico.nome).join(" · ")}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function DashboardProfissional({
  greeting,
  receitaHoje,
  receitaOntem,
  receitaMes,
  agendamentosHoje,
  agendamentosHojeConcluidos,
  agendamentosHojePendentes,
  agendamentosHojeEmAndamento,
  agendamentosHojeCancelados: _cancelados,
  agendamentosMes,
  equipeHoje,
  receitaDiaria,
  produtosBaixoEstoque,
  pendentesCount,
  aniversariantes,
  clientesTotal: _clientesTotal,
}: DashboardProfissionalProps) {
  const hoje = format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
  const hojeStr = hoje.charAt(0).toUpperCase() + hoje.slice(1);

  const agendamentosTotal  = agendamentosHoje.length;
  const pctChange = receitaOntem > 0 ? ((receitaHoje - receitaOntem) / receitaOntem) * 100 : null;
  const metaMensal         = 5000;
  const progressoMes       = Math.min((receitaMes / metaMensal) * 100, 100);
  const ticketMedio        = agendamentosMes > 0 ? receitaMes / agendamentosMes : 0;
  const hasAlerts          = produtosBaixoEstoque > 0 || pendentesCount > 0 || aniversariantes > 0;

  // ── Next upcoming appointment ─────────────────────────────────────────────
  const nextAppt = useMemo(() => {
    const threshold = Date.now() - 5 * 60 * 1000;
    return agendamentosHoje.find(
      (ag) =>
        (ag.status === "PENDENTE" || ag.status === "CONFIRMADO" || ag.status === "EM_ANDAMENTO") &&
        new Date(ag.inicio).getTime() >= threshold
    ) ?? null;
  }, [agendamentosHoje]);

  const minutesUntilNext = useMemo(() => {
    if (!nextAppt) return null;
    const diff = new Date(nextAppt.inicio).getTime() - Date.now();
    return diff < 0 ? 0 : Math.round(diff / 60000);
  }, [nextAppt]);

  // ── Professional columns: group appointments by colaborador ───────────────
  const profColumns = useMemo((): ProfColData[] => {
    const apptMap = new Map<string, AgendamentoItem[]>();
    agendamentosHoje.forEach((ag) => {
      const cid = ag.colaborador.id;
      if (!apptMap.has(cid)) apptMap.set(cid, []);
      apptMap.get(cid)!.push(ag);
    });

    return equipeHoje.map((m) => ({
      id: m.id,
      nome: m.nome,
      image: m.image,
      agendamentosCount: m.agendamentos,
      receita: m.receita,
      items: (apptMap.get(m.id) ?? []).sort(
        (a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime()
      ),
    }));
  }, [agendamentosHoje, equipeHoje]);

  return (
    <div className="min-h-full pb-10 space-y-5">

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  1 · GREETING BANNER                                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl px-6 py-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#100c20 0%,#1a1040 60%,#0f0c1c 100%)" }}
      >
        {/* ambient glow */}
        <div
          className="absolute inset-y-0 right-0 w-72 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at right, rgba(139,92,246,.14) 0%, transparent 70%)" }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-white font-black text-2xl tracking-tight leading-none">{greeting}</h1>
            <p className="text-zinc-500 text-sm mt-1.5 font-medium">{hojeStr}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* stat pills */}
            <Pill icon={<CalendarDays className="w-3.5 h-3.5 text-blue-400"/>} label={`${agendamentosTotal} agendamentos`} />
            <Pill icon={<CheckCircle className="w-3.5 h-3.5 text-emerald-400"/>} label={`${agendamentosHojeConcluidos} concluídos`} />
            {agendamentosHojeEmAndamento > 0 && (
              <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
                {agendamentosHojeEmAndamento} ao vivo
              </div>
            )}
            {agendamentosHojePendentes > 0 && (
              <Pill icon={<Clock className="w-3.5 h-3.5 text-amber-400"/>} label={`${agendamentosHojePendentes} pendentes`} />
            )}
            <Link
              href="/agenda"
              className="flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 transition-colors rounded-xl px-4 py-2 text-xs font-black text-white"
              style={{ boxShadow: "0 0 20px rgba(109,40,217,.45)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Novo Agendamento
            </Link>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  2 · QUICK METRICS ROW                                     */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          icon={<DollarSign className="w-4 h-4 text-emerald-600"/>}
          iconBg="bg-emerald-50"
          value={formatBRL(receitaHoje)}
          label="Receita hoje"
          sub={
            pctChange !== null ? (
              <span className={cn("flex items-center gap-0.5 text-[11px] font-bold", pctChange >= 0 ? "text-emerald-600" : "text-red-500")}>
                {pctChange >= 0 ? <TrendingUp className="w-3 h-3"/> : <TrendingDown className="w-3 h-3"/>}
                {Math.abs(pctChange).toFixed(0)}% vs ontem
              </span>
            ) : <span className="text-[11px] text-gray-300">Sem dados de ontem</span>
          }
        />
        <MetricCard
          icon={<TrendingUp className="w-4 h-4 text-violet-600"/>}
          iconBg="bg-violet-50"
          value={formatBRL(receitaMes)}
          label="Receita do mês"
          sub={
            <div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                <div className="h-full bg-violet-500 rounded-full transition-all duration-700" style={{ width: `${progressoMes}%` }}/>
              </div>
              <p className="text-[10px] text-gray-300 mt-0.5">{progressoMes.toFixed(0)}% da meta de {formatBRL(metaMensal)}</p>
            </div>
          }
        />
        <MetricCard
          icon={<CalendarDays className="w-4 h-4 text-blue-600"/>}
          iconBg="bg-blue-50"
          value={String(agendamentosTotal)}
          label="Agendamentos hoje"
          sub={
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"/>
                {agendamentosHojeConcluidos} conc.
              </span>
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"/>
                {agendamentosHojePendentes} pend.
              </span>
            </div>
          }
        />
        <MetricCard
          icon={<Scissors className="w-4 h-4 text-orange-500"/>}
          iconBg="bg-orange-50"
          value={formatBRL(ticketMedio)}
          label="Ticket médio"
          sub={<span className="text-[11px] text-gray-300">Este mês · {agendamentosMes} atend.</span>}
        />
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  3 · AGENDA AO VIVO — PROFESSIONAL COLUMNS                 */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden">
        {/* Section header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-2 h-2 rounded-full bg-violet-500 animate-pulse" />
            <h2 className="font-black text-gray-900 text-sm">Agenda ao Vivo</h2>
            <span className="text-xs bg-violet-50 text-violet-600 font-black px-2 py-0.5 rounded-full">
              {equipeHoje.length} profissional{equipeHoje.length !== 1 ? "is" : ""}
            </span>
          </div>
          <div className="flex items-center gap-3">
            {nextAppt && minutesUntilNext !== null && (
              <span className="hidden sm:flex items-center gap-1.5 text-xs text-orange-600 bg-orange-50 font-bold px-2.5 py-1 rounded-xl">
                <Clock className="w-3 h-3"/>
                Próximo {formatMinutes(minutesUntilNext)}
              </span>
            )}
            <Link href="/agenda" className="text-xs text-violet-600 hover:text-violet-700 font-semibold flex items-center gap-0.5 transition-colors">
              Agenda completa <ArrowRight className="w-3.5 h-3.5"/>
            </Link>
          </div>
        </div>

        <div className="p-4">
          {equipeHoje.length === 0 ? (
            /* Empty: no team configured */
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
                <UserCheckIcon className="w-7 h-7 text-gray-200" />
              </div>
              <p className="font-bold text-gray-400 text-sm">Nenhum profissional ativo</p>
              <p className="text-xs text-gray-300 mt-1 max-w-xs">
                Cadastre sua equipe para visualizar a agenda ao vivo por profissional
              </p>
              <Link
                href="/equipe"
                className="mt-4 inline-flex items-center gap-1.5 text-violet-600 text-sm font-bold hover:text-violet-700 transition-colors"
              >
                Cadastrar equipe <ArrowRight className="w-3.5 h-3.5"/>
              </Link>
            </div>
          ) : (
            /* Professional columns — horizontal scroll on mobile */
            <div className="flex gap-4 overflow-x-auto pb-1 -mx-1 px-1">
              {profColumns.map((col, i) => (
                <ProfColumn
                  key={col.id}
                  col={col}
                  colorIdx={i}
                  nextApptId={nextAppt?.id ?? null}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/*  4 · BOTTOM ROW: ALERTS + CHART                           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">

        {/* Alerts + Next appointment card */}
        <div className="xl:col-span-2 space-y-4">

          {/* Próximo atendimento */}
          {nextAppt && (
            <div
              className="rounded-2xl p-5 relative overflow-hidden"
              style={{ background: "linear-gradient(135deg,#1c1040,#2e1a66)" }}
            >
              <div
                className="absolute -right-8 -top-8 w-40 h-40 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle,rgba(139,92,246,.22) 0%,transparent 70%)" }}
              />
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-violet-400">Próximo</p>
                  {minutesUntilNext !== null && (
                    <span className="text-[10px] font-black text-violet-200 bg-violet-500/20 border border-violet-500/25 px-2 py-0.5 rounded-lg">
                      {formatMinutes(minutesUntilNext)}
                    </span>
                  )}
                </div>
                <p className="text-white font-black text-lg leading-tight truncate">{nextAppt.cliente?.user.name ?? "Walk-in"}</p>
                <p className="text-zinc-400 text-xs mt-0.5 truncate">{nextAppt.servicos.map(s => s.servico.nome).join(" + ")}</p>
                <div className="flex items-center gap-2 mt-3">
                  <Clock className="w-3.5 h-3.5 text-violet-400"/>
                  <span className="text-sm font-black text-violet-200">{formatTime(nextAppt.inicio)}</span>
                  <span className="text-zinc-700 text-xs">·</span>
                  <span className="text-xs text-zinc-500">{nextAppt.colaborador.user.name.split(" ")[0]}</span>
                </div>
              </div>
            </div>
          )}

          {/* Alerts */}
          <div className="bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5">
            <h3 className="font-black text-gray-900 text-sm mb-3">Alertas</h3>
            {!hasAlerts ? (
              <div className="flex items-center gap-3 bg-emerald-50 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0"/>
                <p className="text-sm font-semibold text-emerald-700">Tudo em ordem</p>
              </div>
            ) : (
              <div className="space-y-2">
                {produtosBaixoEstoque > 0 && (
                  <AlertRow href="/estoque" icon={<Package className="w-3.5 h-3.5 text-amber-600"/>} bg="bg-amber-50 hover:bg-amber-100" iconBg="bg-amber-100"
                    title="Estoque baixo" sub={`${produtosBaixoEstoque} produto${produtosBaixoEstoque !== 1 ? "s" : ""} precisam atenção`}/>
                )}
                {pendentesCount > 0 && (
                  <AlertRow href="/agenda" icon={<Clock className="w-3.5 h-3.5 text-blue-600"/>} bg="bg-blue-50 hover:bg-blue-100" iconBg="bg-blue-100"
                    title="Pendentes" sub={`${pendentesCount} aguardando confirmação`}/>
                )}
                {aniversariantes > 0 && (
                  <AlertRow href="/clientes" icon={<Gift className="w-3.5 h-3.5 text-pink-500"/>} bg="bg-pink-50 hover:bg-pink-100" iconBg="bg-pink-100"
                    title="Aniversariantes" sub={`${aniversariantes} cliente${aniversariantes !== 1 ? "s" : ""} esta semana`}/>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Revenue chart */}
        <div className="xl:col-span-3 bg-white rounded-2xl ring-1 ring-black/5 shadow-sm p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-black text-gray-900 text-sm">Receita — 30 dias</h3>
              <p className="text-[11px] text-gray-400 mt-0.5">Faturamento diário</p>
            </div>
            <span className="text-xs font-black text-violet-600 bg-violet-50 px-3 py-1.5 rounded-xl">
              {formatBRL(receitaMes)} este mês
            </span>
          </div>

          {receitaDiaria.length === 0 ? (
            <div className="flex-1 flex items-center justify-center min-h-[120px]">
              <p className="text-sm text-gray-300 font-medium">Os dados aparecerão aqui após as primeiras transações</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={130}>
              <BarChart data={receitaDiaria} margin={{ top: 2, right: 4, bottom: 0, left: -10 }} barCategoryGap="28%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false}/>
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#d1d5db" }} axisLine={false} tickLine={false} interval="preserveStartEnd"/>
                <YAxis tick={{ fontSize: 9, fill: "#d1d5db" }} axisLine={false} tickLine={false}
                  tickFormatter={(v: number) => v === 0 ? "R$0" : `R$${(v/1000).toFixed(1)}k`} width={42}/>
                <Tooltip content={<ChartTooltip/>} cursor={{ fill: "#f9fafb", radius: 4 }}/>
                <Bar dataKey="total" radius={[3,3,0,0]}>
                  {receitaDiaria.map((e, i) => (
                    <Cell key={i} fill={e.isToday ? "#6d28d9" : "#8b5cf6"} opacity={e.isToday ? 1 : 0.6}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Small helper components ──────────────────────────────────────────────────

function Pill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-300 bg-white/5">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function MetricCard({ icon, iconBg, value, label, sub }: {
  icon: React.ReactNode; iconBg: string; value: string; label: string; sub: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 ring-1 ring-black/5 shadow-sm hover:shadow-md transition-shadow">
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3", iconBg)}>
        {icon}
      </div>
      <p className="text-[26px] font-black text-gray-900 leading-none tabular-nums">{value}</p>
      <p className="text-xs text-gray-400 font-semibold mt-1.5">{label}</p>
      <div className="mt-1.5">{sub}</div>
    </div>
  );
}

function AlertRow({ href, icon, bg, iconBg, title, sub }: {
  href: string; icon: React.ReactNode; bg: string; iconBg: string; title: string; sub: string;
}) {
  return (
    <Link href={href} className="block group">
      <div className={cn("flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors", bg)}>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0", iconBg)}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-black text-gray-800">{title}</p>
          <p className="text-[11px] text-gray-500 mt-0.5">{sub}</p>
        </div>
        <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0"/>
      </div>
    </Link>
  );
}

// icon alias to avoid naming conflict
function UserCheckIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"/>
    </svg>
  );
}
