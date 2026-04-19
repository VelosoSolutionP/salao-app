"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, subDays, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AgendamentoDetailModal } from "./AgendamentoDetailModal";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { useSSE } from "@/hooks/useSSE";
import { formatTime, getInitials } from "@/lib/utils";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

const STATUS_STYLE: Record<string, { dot: string; label: string; text: string; bg: string }> = {
  PENDENTE:       { dot: "bg-amber-400",  label: "Pendente",       text: "text-amber-600",  bg: "bg-amber-50" },
  CONFIRMADO:     { dot: "bg-blue-400",   label: "Confirmado",     text: "text-blue-600",   bg: "bg-blue-50" },
  EM_ANDAMENTO:   { dot: "bg-violet-500 animate-pulse", label: "Em andamento", text: "text-violet-600", bg: "bg-violet-50" },
  CONCLUIDO:      { dot: "bg-emerald-400",label: "Concluído",      text: "text-emerald-600",bg: "bg-emerald-50" },
  CANCELADO:      { dot: "bg-red-400",    label: "Cancelado",      text: "text-red-500",    bg: "bg-red-50" },
  NAO_COMPARECEU: { dot: "bg-gray-300",   label: "Não compareceu", text: "text-gray-400",   bg: "bg-gray-50" },
};

const COLLAB_COLORS = [
  "bg-violet-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500",  "bg-pink-500", "bg-cyan-500",
  "bg-orange-500", "bg-teal-500",
];

interface Agendamento {
  id: string;
  inicio: string;
  fim: string;
  status: string;
  totalPrice: number;
  cliente: { user: { name: string; phone: string | null } } | null;
  clienteNome?: string;
  colaborador: { id: string; user: { name: string; image: string | null } };
  servicos: Array<{ servico: { nome: string } }>;
}

interface Colaborador {
  id: string;
  user: { name: string; image: string | null };
}

export function AgendaDia() {
  const qc = useQueryClient();
  const [date, setDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [filterColabs, setFilterColabs] = useState<string[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [novoOpen, setNovoOpen] = useState(false);

  const displayDate = new Date(date + "T12:00:00");
  const isDateToday = isToday(displayDate);

  // Real-time via SSE
  useSSE(() => {
    qc.invalidateQueries({ queryKey: ["agendamentos-dia", date] });
  });

  const { data: agendamentos = [], isLoading, refetch } = useQuery<Agendamento[]>({
    queryKey: ["agendamentos-dia", date],
    queryFn: async () => {
      const res = await fetch(`/api/agendamentos?dataInicio=${date}&dataFim=${date}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
    staleTime: 0,
  });

  const { data: colaboradores = [] } = useQuery<Colaborador[]>({
    queryKey: ["colaboradores"],
    queryFn: () => fetch("/api/colaboradores").then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
    staleTime: 300_000,
  });

  // Map colaborador id → color index
  const collabColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    colaboradores.forEach((c, i) => {
      map[c.id] = COLLAB_COLORS[i % COLLAB_COLORS.length];
    });
    return map;
  }, [colaboradores]);

  const filtered = useMemo(() => {
    if (filterColabs.length === 0) return agendamentos;
    return agendamentos.filter((a) => filterColabs.includes(a.colaborador.id));
  }, [agendamentos, filterColabs]);

  const active = filtered.filter((a) => !["CANCELADO", "NAO_COMPARECEU"].includes(a.status));
  const cancelled = filtered.filter((a) => ["CANCELADO", "NAO_COMPARECEU"].includes(a.status));

  function toggleColab(id: string) {
    setFilterColabs((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  function prevDay() { setDate(format(subDays(displayDate, 1), "yyyy-MM-dd")); }
  function nextDay() { setDate(format(addDays(displayDate, 1), "yyyy-MM-dd")); }
  function goToday()  { setDate(format(new Date(), "yyyy-MM-dd")); }

  const clientName = (a: Agendamento) =>
    a.cliente?.user?.name ?? a.clienteNome ?? "Cliente avulso";

  return (
    <div className="space-y-4">
      {/* ── Top bar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Date nav */}
        <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-gray-100 shadow-sm px-1 py-1">
          <button
            onClick={prevDay}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors ${
              isDateToday
                ? "bg-violet-600 text-white"
                : "text-gray-700 hover:bg-gray-100"
            }`}
          >
            {isDateToday
              ? "Hoje"
              : format(displayDate, "dd 'de' MMM", { locale: ptBR })}
          </button>
          <button
            onClick={nextDay}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Full date label */}
        <span className="text-sm font-semibold text-gray-700 capitalize">
          {format(displayDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setNovoOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-white transition-all"
            style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 4px 12px rgba(109,40,217,.3)" }}
          >
            <Plus className="w-4 h-4" />
            Novo agendamento
          </button>
        </div>
      </div>

      {/* ── Professional filter ── */}
      {colaboradores.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
            <Users className="w-3.5 h-3.5" />
            Filtrar por profissional:
          </div>

          {colaboradores.map((c) => {
            const active = filterColabs.includes(c.id);
            const colorCls = collabColorMap[c.id] ?? "bg-violet-500";
            return (
              <button
                key={c.id}
                onClick={() => toggleColab(c.id)}
                className={`flex items-center gap-1.5 pl-1 pr-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  active
                    ? "bg-white border-gray-200 text-gray-800 shadow-sm"
                    : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Avatar className="w-5 h-5">
                  <AvatarFallback className={`text-[9px] text-white font-black ${colorCls}`}>
                    {getInitials(c.user.name)}
                  </AvatarFallback>
                </Avatar>
                {c.user.name.split(" ")[0]}
                {active && (
                  <X className="w-2.5 h-2.5 text-gray-400 ml-0.5" />
                )}
              </button>
            );
          })}

          {filterColabs.length > 0 && (
            <button
              onClick={() => setFilterColabs([])}
              className="text-xs text-violet-600 font-semibold hover:text-violet-700 transition-colors"
            >
              Limpar filtro
            </button>
          )}
        </div>
      )}

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total do dia", value: filtered.length, sub: "agendamentos" },
          { label: "Ativos", value: active.length, sub: "em andamento / confirmados" },
          { label: "Concluídos", value: filtered.filter(a => a.status === "CONCLUIDO").length, sub: "atendidos" },
          {
            label: "Receita do dia",
            value: `R$ ${active.reduce((s, a) => s + Number(a.totalPrice), 0).toFixed(2)}`,
            sub: "estimado",
          },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm px-4 py-3">
            <p className="text-[11px] text-gray-400 font-semibold">{stat.label}</p>
            <p className="text-xl font-black text-gray-900 mt-0.5">{stat.value}</p>
            <p className="text-[10px] text-gray-400 mt-0.5">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Timeline ── */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-50">
          <h3 className="font-bold text-gray-900 text-sm">
            Agendamentos — {format(displayDate, "dd/MM/yyyy")}
          </h3>
          <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full">
            {filtered.length}
          </span>
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-gray-300 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center px-6">
            <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">
              {filterColabs.length > 0 ? "Nenhum agendamento para este profissional" : "Nenhum agendamento neste dia"}
            </p>
            <p className="text-xs text-gray-400 mt-1">
              {isDateToday ? "Sua agenda está livre hoje" : "Sem agendamentos registrados"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {/* Active appointments */}
            {active.map((a) => {
              const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.PENDENTE;
              const collabColor = collabColorMap[a.colaborador.id] ?? "bg-violet-500";
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className="w-full flex items-start gap-3 px-5 py-4 hover:bg-gray-50/60 transition-colors text-left group"
                >
                  {/* Time */}
                  <div className="min-w-[52px] text-center pt-0.5 flex-shrink-0">
                    <p className="text-sm font-black text-violet-600 tabular-nums">{formatTime(new Date(a.inicio))}</p>
                    <p className="text-[10px] text-gray-400 tabular-nums">{formatTime(new Date(a.fim))}</p>
                  </div>

                  {/* Color accent */}
                  <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${collabColor} opacity-60`} />

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-violet-700 transition-colors">
                          {clientName(a)}
                        </p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {a.servicos.map((sv) => sv.servico.nome).join(" · ")}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-black text-gray-900">
                          R$ {Number(a.totalPrice).toFixed(2)}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${s.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                    </div>

                    {/* Professional */}
                    <div className="flex items-center gap-2 mt-2">
                      <Avatar className="w-5 h-5">
                        <AvatarFallback className={`text-[9px] text-white font-black ${collabColor}`}>
                          {getInitials(a.colaborador.user.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-[11px] text-gray-400 font-medium">{a.colaborador.user.name}</span>
                    </div>
                  </div>
                </button>
              );
            })}

            {/* Cancelled / no-show */}
            {cancelled.length > 0 && (
              <>
                <div className="px-5 py-2 bg-gray-50/60">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                    Cancelados / Não compareceu ({cancelled.length})
                  </p>
                </div>
                {cancelled.map((a) => {
                  const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.CANCELADO;
                  return (
                    <button
                      key={a.id}
                      onClick={() => setSelectedId(a.id)}
                      className="w-full flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors text-left opacity-50 group"
                    >
                      <div className="min-w-[52px] text-center pt-0.5 flex-shrink-0">
                        <p className="text-sm font-black text-gray-400 tabular-nums line-through">{formatTime(new Date(a.inicio))}</p>
                      </div>
                      <div className="w-1 self-stretch rounded-full flex-shrink-0 bg-gray-200" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-500 truncate">{clientName(a)}</p>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {a.servicos.map((sv) => sv.servico.nome).join(" · ")}
                        </p>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${s.text} mt-1`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {selectedId && (
        <AgendamentoDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => {
            qc.invalidateQueries({ queryKey: ["agendamentos-dia", date] });
            toast.success("Agendamento atualizado!");
          }}
        />
      )}

      <NovoAgendamentoModal
        open={novoOpen}
        initialSlot={{ date, time: "09:00" }}
        onClose={() => setNovoOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["agendamentos-dia", date] });
          toast.success("Agendamento criado!");
        }}
      />
    </div>
  );
}
