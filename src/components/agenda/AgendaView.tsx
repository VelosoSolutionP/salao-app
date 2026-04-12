"use client";

import { useEffect, useRef, useState } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import ptBrLocale from "@fullcalendar/core/locales/pt-br";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { NovoAgendamentoModal } from "./NovoAgendamentoModal";
import { AgendamentoDetailModal } from "./AgendamentoDetailModal";
import { useSSE } from "@/hooks/useSSE";

const STATUS_COLORS: Record<string, string> = {
  PENDENTE: "#f59e0b",
  CONFIRMADO: "#3b82f6",
  EM_ANDAMENTO: "#8b5cf6",
  CONCLUIDO: "#10b981",
  CANCELADO: "#ef4444",
  NAO_COMPARECEU: "#9ca3af",
};

export function AgendaView() {
  const queryClient = useQueryClient();
  const [novoModalOpen, setNovoModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const calendarRef = useRef<any>(null);

  // Real-time updates via SSE
  useSSE(() => {
    queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
  });

  const { data: agendamentos, isLoading, refetch } = useQuery({
    queryKey: ["agendamentos"],
    queryFn: async () => {
      const res = await fetch("/api/agendamentos");
      if (!res.ok) throw new Error("Erro ao carregar agendamentos");
      return res.json();
    },
  });

  const events = (agendamentos ?? []).map((a: any) => ({
    id: a.id,
    title: `${a.cliente?.user?.name} — ${a.servicos?.map((s: any) => s.servico?.nome).join(", ")}`,
    start: a.inicio,
    end: a.fim,
    backgroundColor: STATUS_COLORS[a.status] ?? "#7c3aed",
    borderColor: "transparent",
    extendedProps: { status: a.status, colaborador: a.colaborador?.user?.name },
  }));

  function handleDateClick(info: any) {
    const dateStr = info.dateStr.split("T")[0];
    const timeStr = info.dateStr.includes("T")
      ? info.dateStr.split("T")[1].slice(0, 5)
      : "09:00";
    setSelectedSlot({ date: dateStr, time: timeStr });
    setNovoModalOpen(true);
  }

  function handleEventClick(info: any) {
    setSelectedId(info.event.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, color]) => (
            <div key={status} className="flex items-center gap-1.5">
              <div
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-gray-500">
                {{ PENDENTE: "Pendente", CONFIRMADO: "Confirmado", EM_ANDAMENTO: "Em andamento", CONCLUIDO: "Concluído", CANCELADO: "Cancelado", NAO_COMPARECEU: "Não compareceu" }[status]}
              </span>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => { setSelectedSlot(null); setNovoModalOpen(true); }}>
            <Plus className="w-4 h-4 mr-1" />
            Novo agendamento
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-1 overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[timeGridPlugin, dayGridPlugin, listPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          locale={ptBrLocale}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          events={events}
          editable={false}
          selectable
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          slotMinTime="07:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          nowIndicator
          height="auto"
          contentHeight={600}
          loading={(l) => !l && !isLoading}
          eventContent={(info) => (
            <div className="px-1 py-0.5 overflow-hidden">
              <p className="text-xs font-semibold truncate">{info.event.title}</p>
              <p className="text-[10px] opacity-80 truncate">
                {info.event.extendedProps.colaborador}
              </p>
            </div>
          )}
        />
      </div>

      <NovoAgendamentoModal
        open={novoModalOpen}
        initialSlot={selectedSlot}
        onClose={() => { setNovoModalOpen(false); setSelectedSlot(null); }}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ["agendamentos"] });
          toast.success("Agendamento criado!");
        }}
      />

      {selectedId && (
        <AgendamentoDetailModal
          id={selectedId}
          onClose={() => setSelectedId(null)}
          onUpdate={() => queryClient.invalidateQueries({ queryKey: ["agendamentos"] })}
        />
      )}
    </div>
  );
}
