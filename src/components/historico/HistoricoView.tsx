"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatBRL, getInitials } from "@/lib/utils";
import {
  Calendar, Clock, Scissors, AlertTriangle, CheckCircle2,
  XCircle, Loader2, Plus, ChevronRight, Ban,
} from "lucide-react";
import { format, differenceInHours, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgendamentoStatus =
  | "PENDENTE" | "CONFIRMADO" | "EM_ANDAMENTO"
  | "CONCLUIDO" | "CANCELADO" | "NAO_COMPARECEU";

interface Servico { nome: string; preco: number }
interface AgendamentoServico { servico: Servico; preco: number }
interface Colaborador { user: { name: string; image?: string | null } }
interface Salon {
  name: string;
  cancelamentoHorasMinimo: number;
  multaValor: number | null;
  multaTipo: string | null;
}

export interface AgendamentoItem {
  id: string;
  inicio: string;
  fim: string;
  status: AgendamentoStatus;
  totalPrice: number;
  multaAplicada: boolean;
  multaValor: number | null;
  multaPaga: boolean;
  colaborador: Colaborador;
  servicos: AgendamentoServico[];
  salon: Salon;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AgendamentoStatus, { label: string; color: string; icon: React.ElementType }> = {
  PENDENTE:      { label: "Pendente",       color: "bg-yellow-100 text-yellow-700",  icon: Clock        },
  CONFIRMADO:    { label: "Confirmado",     color: "bg-blue-100 text-blue-700",      icon: CheckCircle2 },
  EM_ANDAMENTO:  { label: "Em andamento",   color: "bg-violet-100 text-violet-700",  icon: Scissors     },
  CONCLUIDO:     { label: "Concluído",      color: "bg-green-100 text-green-700",    icon: CheckCircle2 },
  CANCELADO:     { label: "Cancelado",      color: "bg-gray-100 text-gray-500",      icon: XCircle      },
  NAO_COMPARECEU:{ label: "Não compareceu", color: "bg-red-100 text-red-600",        icon: Ban          },
};

function canCancel(agendamento: AgendamentoItem): boolean {
  const terminal: AgendamentoStatus[] = ["CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"];
  if (terminal.includes(agendamento.status)) return false;
  if (isPast(new Date(agendamento.inicio))) return false;
  return true;
}

function cancelIsLate(agendamento: AgendamentoItem): boolean {
  return differenceInHours(new Date(agendamento.inicio), new Date()) < agendamento.salon.cancelamentoHorasMinimo;
}

// ─── HistoricoView ────────────────────────────────────────────────────────────

export function HistoricoView({ agendamentos: initial }: { agendamentos: AgendamentoItem[] }) {
  const router = useRouter();
  const [agendamentos, setAgendamentos] = useState(initial);
  const [cancelingId, setCancelingId] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);

  const upcoming = agendamentos.filter(
    (a) => !isPast(new Date(a.inicio)) || a.status === "EM_ANDAMENTO"
  );
  const past = agendamentos.filter(
    (a) => isPast(new Date(a.inicio)) && a.status !== "EM_ANDAMENTO"
  );

  async function handleCancel(id: string) {
    setCancelingId(id);
    setConfirmCancel(null);
    try {
      const res = await fetch(`/api/agendamentos/cliente/${id}`, { method: "PATCH" });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao cancelar");
        return;
      }

      const newStatus = json.status as AgendamentoStatus;
      setAgendamentos((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status: newStatus, multaAplicada: json.multaAplicada ?? a.multaAplicada, multaValor: json.multaValor ?? a.multaValor } : a))
      );

      if (newStatus === "CANCELADO") {
        toast.success("Agendamento cancelado.");
      } else {
        toast.warning(json.message, { duration: 8000 });
      }
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setCancelingId(null);
    }
  }

  function renderCard(ag: AgendamentoItem) {
    const cfg = STATUS_CONFIG[ag.status];
    const StatusIcon = cfg.icon;
    const isUpcoming = !isPast(new Date(ag.inicio));
    const late = isUpcoming && canCancel(ag) && cancelIsLate(ag);

    return (
      <div
        key={ag.id}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-3 flex items-start gap-3">
          <Avatar className="w-10 h-10 flex-shrink-0 ring-2 ring-white shadow">
            <AvatarImage src={ag.colaborador.user.image ?? undefined} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white text-xs font-black">
              {getInitials(ag.colaborador.user.name)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900 text-sm truncate">{ag.colaborador.user.name}</p>
            <p className="text-xs text-gray-400 truncate">{ag.salon.name}</p>
          </div>
          <Badge className={`text-[10px] font-black px-2 py-0.5 flex items-center gap-1 ${cfg.color}`}>
            <StatusIcon className="w-3 h-3" />
            {cfg.label}
          </Badge>
        </div>

        {/* Serviços */}
        <div className="px-4 pb-3 space-y-1">
          {ag.servicos.map((sv, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-violet-400" />
                {sv.servico.nome}
              </span>
              <span className="font-semibold text-gray-700">{formatBRL(sv.preco)}</span>
            </div>
          ))}
        </div>

        {/* Data e Total */}
        <div className="mx-4 mb-3 flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-xl">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-violet-400" />
              {format(new Date(ag.inicio), "dd 'de' MMM", { locale: ptBR })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-violet-400" />
              {format(new Date(ag.inicio), "HH:mm")}
            </span>
          </div>
          <span className="font-black text-sm text-gray-900">{formatBRL(ag.totalPrice)}</span>
        </div>

        {/* Multa pendente */}
        {ag.multaAplicada && !ag.multaPaga && (
          <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2.5 bg-red-50 border border-red-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">
              <span className="font-black">Multa pendente:</span>{" "}
              {ag.multaValor ? `R$ ${Number(ag.multaValor).toFixed(2)} será cobrada no próximo agendamento.` : "Será cobrada no próximo agendamento."}
            </p>
          </div>
        )}

        {/* Aviso de cancelamento tardio */}
        {late && (
          <div className="mx-4 mb-3 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-100 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Cancelamento fora do prazo ({ag.salon.cancelamentoHorasMinimo}h de antecedência).
              {ag.salon.multaValor
                ? ` Uma taxa de ${ag.salon.multaTipo === "PERCENTUAL" ? `${ag.salon.multaValor}%` : `R$ ${Number(ag.salon.multaValor).toFixed(2)}`} será aplicada.`
                : " Será registrado como não comparecimento."}
            </p>
          </div>
        )}

        {/* Actions */}
        {canCancel(ag) && (
          <div className="px-4 pb-4">
            {confirmCancel === ag.id ? (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmCancel(null)}
                  className="flex-1 h-9 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  onClick={() => handleCancel(ag.id)}
                  disabled={cancelingId === ag.id}
                  className="flex-1 h-9 rounded-xl bg-red-500 text-white text-xs font-black hover:bg-red-600 transition-colors flex items-center justify-center gap-1 disabled:opacity-70"
                >
                  {cancelingId === ag.id
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : "Confirmar cancelamento"
                  }
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmCancel(ag.id)}
                className="w-full h-9 rounded-xl border border-red-200 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors"
              >
                Cancelar agendamento
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Upcoming */}
      <section>
        <h2 className="text-white font-black text-base mb-3 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Próximos agendamentos
        </h2>
        {upcoming.length === 0 ? (
          <div className="bg-white/10 rounded-2xl p-6 text-center">
            <Calendar className="w-10 h-10 text-white/30 mx-auto mb-2" />
            <p className="text-white/50 text-sm">Nenhum agendamento futuro</p>
            <button
              onClick={() => router.push("/agendar")}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-white text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Agendar agora
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {upcoming.map(renderCard)}
          </div>
        )}
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section>
          <h2 className="text-white/70 font-black text-sm mb-3 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" />
            Histórico
          </h2>
          <div className="space-y-3">
            {past.slice(0, 10).map(renderCard)}
          </div>
        </section>
      )}

      {/* FAB */}
      <div className="fixed bottom-6 right-6">
        <button
          onClick={() => router.push("/agendar")}
          className="flex items-center gap-2 px-5 py-3 bg-white text-violet-700 font-black text-sm rounded-2xl shadow-2xl hover:shadow-violet-300/30 hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" />
          Novo agendamento
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
