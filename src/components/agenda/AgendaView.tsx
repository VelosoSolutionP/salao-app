"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, addDays, startOfWeek, isSameDay, isToday, addWeeks, subWeeks } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { AgendamentoDetailModal } from "./AgendamentoDetailModal";
import { useSSE } from "@/hooks/useSSE";

/* ── constants ── */
const START_HOUR = 7;
const END_HOUR   = 22;
const HOURS      = END_HOUR - START_HOUR;          // 15
const HOUR_PX    = 64;                              // px per hour
const TOTAL_PX   = HOURS * HOUR_PX;                // 960px

const STATUS: Record<string, { bg: string; border: string; label: string }> = {
  PENDENTE:       { bg: "#fef3c7", border: "#f59e0b", label: "Pendente" },
  CONFIRMADO:     { bg: "#dbeafe", border: "#3b82f6", label: "Confirmado" },
  EM_ANDAMENTO:   { bg: "#ede9fe", border: "#7c3aed", label: "Em andamento" },
  CONCLUIDO:      { bg: "#d1fae5", border: "#10b981", label: "Concluído" },
  CANCELADO:      { bg: "#fee2e2", border: "#ef4444", label: "Cancelado" },
  NAO_COMPARECEU: { bg: "#dcfce7", border: "#22c55e", label: "Não compareceu" },
};

function topPct(date: Date) {
  const mins = date.getHours() * 60 + date.getMinutes() - START_HOUR * 60;
  return Math.max(0, (mins / (HOURS * 60)) * TOTAL_PX);
}
function heightPx(start: Date, end: Date) {
  const mins = (end.getTime() - start.getTime()) / 60000;
  return Math.max(18, (mins / 60) * HOUR_PX);
}

type View = "week" | "day";

export function AgendaView() {
  const queryClient = useQueryClient();
  const scrollRef    = useRef<HTMLDivElement>(null);
  const [view, setView]             = useState<View>("week");
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot]   = useState<{ date: string; time: string } | null>(null);
  const [selectedId, setSelectedId]       = useState<string | null>(null);
  const [nowY, setNowY] = useState(0);

  useSSE(() => { queryClient.invalidateQueries({ queryKey: ["agenda"] }); });

  /* week start = Monday */
  const weekStart = useMemo(
    () => startOfWeek(currentDate, { weekStartsOn: 1 }),
    [currentDate]
  );
  const days = useMemo(
    () => Array.from({ length: view === "week" ? 7 : 1 }, (_, i) =>
      view === "week" ? addDays(weekStart, i) : currentDate
    ),
    [weekStart, currentDate, view]
  );

  const dataInicio = format(days[0], "yyyy-MM-dd");
  const dataFim    = format(days[days.length - 1], "yyyy-MM-dd");

  const { data: agendamentos = [] } = useQuery<any[]>({
    queryKey: ["agenda", dataInicio, dataFim],
    queryFn: async () => {
      const res = await fetch(`/api/agendamentos?dataInicio=${dataInicio}&dataFim=${dataFim}`);
      if (!res.ok) throw new Error("Erro");
      return res.json();
    },
  });

  /* current-time indicator */
  useEffect(() => {
    function update() {
      const now  = new Date();
      const mins = now.getHours() * 60 + now.getMinutes() - START_HOUR * 60;
      setNowY((mins / (HOURS * 60)) * TOTAL_PX);
    }
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, []);

  /* scroll to current time on mount */
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = Math.max(0, nowY - 120);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── helpers ── */
  function prev() {
    setCurrentDate(d => view === "week" ? subWeeks(d, 1) : addDays(d, -1));
  }
  function next() {
    setCurrentDate(d => view === "week" ? addWeeks(d, 1) : addDays(d, 1));
  }
  function goToday() { setCurrentDate(new Date()); }

  function openNew(date: Date, hour: number) {
    setSelectedSlot({
      date: format(date, "yyyy-MM-dd"),
      time: `${String(hour).padStart(2, "0")}:00`,
    });
    setNovoModalOpen(true);
  }

  function agForDay(day: Date) {
    return agendamentos.filter((a: any) => isSameDay(new Date(a.inicio), day));
  }

  /* ── title ── */
  const title = view === "week"
    ? `${format(days[0], "d MMM", { locale: ptBR })} – ${format(days[6], "d MMM yyyy", { locale: ptBR })}`
    : format(currentDate, "EEEE, d 'de' MMMM yyyy", { locale: ptBR });

  return (
    <div className="flex flex-col bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden select-none">

      {/* ── Toolbar ── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 gap-3 flex-wrap">
        {/* Left: nav */}
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <button
            onClick={goToday}
            className="px-3 h-8 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Hoje
          </button>
          <div className="flex items-center">
            <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-500">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <span className="text-sm font-semibold text-gray-800 capitalize">{title}</span>
        </div>

        {/* Right: view switcher + new */}
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {(["week", "day"] as View[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 h-7 text-xs font-semibold transition-colors ${
                  view === v
                    ? "bg-violet-600 text-white"
                    : "text-gray-500 hover:bg-gray-50"
                }`}
              >
                {v === "week" ? "Semana" : "Dia"}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setSelectedSlot(null); setNovoModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 h-8 rounded-xl text-white text-xs font-bold shadow-sm hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Novo
          </button>
        </div>
      </div>

      {/* ── Day-header row ── */}
      <div className={`grid border-b border-gray-100 bg-gray-50/60`}
        style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)` }}
      >
        <div className="py-2" /> {/* spacer for time column */}
        {days.map((day) => {
          const today = isToday(day);
          return (
            <div key={day.toISOString()} className="flex flex-col items-center py-2 gap-0.5">
              <span className={`text-[10px] font-semibold uppercase tracking-wider ${today ? "text-violet-600" : "text-gray-400"}`}>
                {format(day, "EEE", { locale: ptBR })}
              </span>
              <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full transition-colors ${
                today ? "bg-violet-600 text-white" : "text-gray-700"
              }`}>
                {format(day, "d")}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── Time grid ── */}
      <div ref={scrollRef} className="overflow-y-auto" style={{ maxHeight: 620 }}>
        <div className="relative" style={{ gridTemplateColumns: `56px repeat(${days.length}, 1fr)`, display: "grid" }}>

          {/* Time labels */}
          <div className="relative z-10">
            {Array.from({ length: HOURS }, (_, i) => (
              <div key={i} style={{ height: HOUR_PX }} className="flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                  {String(START_HOUR + i).padStart(2, "0")}:00
                </span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {days.map((day) => {
            const dayAgs = agForDay(day);
            const todayCol = isToday(day);

            return (
              <div
                key={day.toISOString()}
                className={`relative border-l border-gray-100 ${todayCol ? "bg-violet-50/30" : ""}`}
                style={{ height: TOTAL_PX }}
              >
                {/* Hour lines */}
                {Array.from({ length: HOURS }, (_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-gray-100 pointer-events-none"
                    style={{ top: i * HOUR_PX }}
                  />
                ))}
                {/* Half-hour dashed lines */}
                {Array.from({ length: HOURS }, (_, i) => (
                  <div
                    key={`h${i}`}
                    className="absolute left-0 right-0 border-t border-dashed border-gray-100/70 pointer-events-none"
                    style={{ top: i * HOUR_PX + HOUR_PX / 2 }}
                  />
                ))}

                {/* Click zones */}
                {Array.from({ length: HOURS }, (_, i) => (
                  <div
                    key={`z${i}`}
                    className="absolute left-0 right-0 hover:bg-violet-50/50 cursor-pointer transition-colors"
                    style={{ top: i * HOUR_PX, height: HOUR_PX }}
                    onClick={() => openNew(day, START_HOUR + i)}
                  />
                ))}

                {/* Now indicator */}
                {todayCol && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none flex items-center" style={{ top: nowY }}>
                    <div className="w-2.5 h-2.5 rounded-full bg-violet-600 -ml-1.5 flex-shrink-0" />
                    <div className="flex-1 h-0.5 bg-violet-600" />
                  </div>
                )}

                {/* Events */}
                {dayAgs.map((ag: any) => {
                  const start = new Date(ag.inicio);
                  const end   = new Date(ag.fim);
                  const s     = STATUS[ag.status] ?? STATUS.PENDENTE;
                  const h     = heightPx(start, end);
                  const short = h < 40;

                  return (
                    <div
                      key={ag.id}
                      onClick={(e) => { e.stopPropagation(); setSelectedId(ag.id); }}
                      className="absolute left-1 right-1 rounded-lg cursor-pointer overflow-hidden z-10 transition-all hover:brightness-95 hover:shadow-md"
                      style={{
                        top: topPct(start),
                        height: h,
                        backgroundColor: s.bg,
                        borderLeft: `3px solid ${s.border}`,
                      }}
                    >
                      <div className="px-1.5 py-1 h-full flex flex-col overflow-hidden">
                        <p className="text-[11px] font-bold leading-tight truncate" style={{ color: s.border }}>
                          {ag.cliente?.user?.name ?? "Walk-in"}
                        </p>
                        {!short && (
                          <p className="text-[10px] leading-tight truncate text-gray-500 mt-0.5">
                            {ag.servicos?.map((sv: any) => sv.servico?.nome).join(", ")}
                          </p>
                        )}
                        {!short && (
                          <p className="text-[10px] leading-tight truncate text-gray-400">
                            {format(start, "HH:mm")}–{format(end, "HH:mm")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-gray-100 bg-gray-50/50 flex-wrap">
        {Object.entries(STATUS).map(([key, { border, label }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: border }} />
            <span className="text-[10px] text-gray-500 font-medium">{label}</span>
          </div>
        ))}
      </div>

      {/* ── Modals ── */}
      <NovoAgendamentoModal
        open={novoModalOpen}
        initialSlot={selectedSlot}
        onClose={() => { setNovoModalOpen(false); setSelectedSlot(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["agenda"] });
          toast.success("Agendamento criado!");
        }}
      />
      {selectedId && (
        <AgendamentoDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["agenda"] })}
        />
      )}
    </div>
  );
}
