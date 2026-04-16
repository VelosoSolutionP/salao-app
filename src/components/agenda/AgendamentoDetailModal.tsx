"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime, formatBRL, minutesToHuman } from "@/lib/utils";
import {
  Check, X, Play, MessageCircle, Loader2,
  Clock, CalendarDays, Scissors,
  Store, Package,
} from "lucide-react";
import { PagamentoModal } from "@/components/agenda/PagamentoModal";

/* ─────────────────────── constants ─────────────────────── */

const STATUS_CFG: Record<string, {
  label: string;
  dot: string;
  gradient: string;
}> = {
  PENDENTE:       { label: "Pendente",       dot: "bg-amber-300",   gradient: "linear-gradient(135deg,#d97706,#b45309)" },
  CONFIRMADO:     { label: "Confirmado",     dot: "bg-blue-300",    gradient: "linear-gradient(135deg,#2563eb,#1d4ed8)" },
  EM_ANDAMENTO:   { label: "Em andamento",   dot: "bg-violet-300",  gradient: "linear-gradient(135deg,#7c3aed,#4f46e5)" },
  CONCLUIDO:      { label: "Concluído",      dot: "bg-emerald-300", gradient: "linear-gradient(135deg,#059669,#047857)" },
  CANCELADO:      { label: "Cancelado",      dot: "bg-red-300",     gradient: "linear-gradient(135deg,#dc2626,#b91c1c)" },
  NAO_COMPARECEU: { label: "Não compareceu", dot: "bg-gray-300",    gradient: "linear-gradient(135deg,#6b7280,#4b5563)" },
};


const PAGAMENTO_LABELS: Record<string, string> = {
  DINHEIRO:       "Dinheiro",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO:  "Cartão de Débito",
  PIX:            "PIX",
  TRANSFERENCIA:  "Transferência",
};

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function nameGradient(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
}

/* ─────────────────────── component ─────────────────────── */

export function AgendamentoDetailModal({
  id,
  onClose,
  onUpdate,
}: {
  id: string;
  onClose: () => void;
  onUpdate: () => void;
}) {
  const queryClient = useQueryClient();
  const [usouProprioProduto, setUsouProprioProduto] = useState(false);
  const [showPagamento, setShowPagamento] = useState(false);

  const { data: ag, isLoading } = useQuery({
    queryKey: ["agendamento", id],
    queryFn: () => fetch(`/api/agendamentos/${id}`).then((r) => r.json()),
  });

  const mutation = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      fetch(`/api/agendamentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }).then((r) => r.json()),
    onSuccess: (res) => {
      if (res.error) { toast.error(res.error); return; }
      toast.success("Agendamento atualizado");
      queryClient.invalidateQueries({ queryKey: ["agendamento", id] });
      onUpdate();
    },
    onError: () => toast.error("Erro ao atualizar"),
  });

  const busy = mutation.isPending;

  function act(payload: Record<string, unknown>) { mutation.mutate(payload); }
  function confirmar()     { act({ status: "CONFIRMADO" }); }
  function iniciar()       { act({ status: "EM_ANDAMENTO" }); }
  function cancelar()      { act({ status: "CANCELADO" }); }
  function naoCompareceu() { act({ status: "NAO_COMPARECEU" }); }
  function concluir() {
    setShowPagamento(true);
  }

  function openWhatsApp() {
    if (!ag?.cliente?.user?.phone) return;
    const phone = ag.cliente.user.phone.replace(/\D/g, "");
    const msg   = encodeURIComponent(
      `Olá ${ag.cliente.user.name}! Confirmando seu agendamento para ${formatDateTime(ag.inicio)}.`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  }

  const status    = ag?.status ?? "PENDENTE";
  const cfg       = STATUS_CFG[status] ?? STATUS_CFG.PENDENTE;
  const clientName = ag?.cliente?.user?.name ?? "Cliente";

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md p-0 gap-0 overflow-hidden flex flex-col max-h-[90vh]"
      >
        <DialogTitle className="sr-only">Detalhes do Agendamento</DialogTitle>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
          </div>

        ) : ag && !ag.error ? (
          <>
            {/* ── Gradient header ── */}
            <div
              className="flex-shrink-0 px-6 py-6 relative overflow-hidden"
              style={{ background: cfg.gradient }}
            >
              {/* decorative circles */}
              <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
              <div className="absolute -bottom-6 -left-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />

              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-white" />
              </button>

              <div className="relative">
                {/* Client avatar + name */}
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${nameGradient(clientName)} flex items-center justify-center text-white text-xl font-bold ring-4 ring-white/20 shadow-lg flex-shrink-0`}
                  >
                    {initials(clientName)}
                  </div>
                  <div>
                    <p className="text-white font-bold text-lg leading-tight">{clientName}</p>
                    <p className="text-white/70 text-sm">
                      {ag.cliente?.user?.phone ?? ag.cliente?.user?.email ?? "—"}
                    </p>
                  </div>
                </div>

                {/* Status pill */}
                <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full">
                  <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} animate-pulse`} />
                  <span className="text-white text-xs font-semibold">{cfg.label}</span>
                </div>
              </div>
            </div>

            {/* ── Scrollable body ── */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">

              {/* Quick info cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    <CalendarDays className="w-3.5 h-3.5" /> Data &amp; Hora
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">
                    {formatDateTime(ag.inicio)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-gray-400 text-xs mb-1">
                    ✂️ Profissional
                  </div>
                  <p className="text-sm font-semibold text-gray-800 leading-snug">
                    {ag.colaborador?.user?.name ?? "—"}
                  </p>
                </div>
              </div>

              {/* Services list */}
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Serviços</p>
                <div className="space-y-2">
                  {ag.servicos?.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl p-3 shadow-sm"
                    >
                      <div className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Scissors className="w-4 h-4 text-violet-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{s.servico?.nome}</p>
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {minutesToHuman(s.servico?.duracao ?? 0)}
                        </p>
                      </div>
                      <p className="text-sm font-bold text-violet-700 flex-shrink-0">
                        {formatBRL(s.servico?.preco ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 rounded-xl border border-violet-100">
                <span className="text-sm font-medium text-gray-600">Total</span>
                <span className="text-xl font-bold text-violet-700">{formatBRL(ag.totalPrice)}</span>
              </div>

              {/* Paid method (concluded) */}
              {ag.pagamento && (
                <div className="flex items-center justify-between px-4 py-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-sm font-medium text-emerald-700">Pago via</span>
                  <span className="text-sm font-bold text-emerald-700">
                    {PAGAMENTO_LABELS[ag.pagamento] ?? ag.pagamento}
                  </span>
                </div>
              )}

              {/* Observations */}
              {ag.observacoes && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                  <p className="text-xs font-semibold text-amber-600 mb-1">Observações</p>
                  <p className="text-sm text-amber-800">{ag.observacoes}</p>
                </div>
              )}

              {/* Product type toggle — only when EM_ANDAMENTO */}
              {status === "EM_ANDAMENTO" && (
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                    Produto utilizado
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setUsouProprioProduto(false)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        !usouProprioProduto
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-100 bg-white text-gray-500 hover:border-blue-200"
                      }`}
                    >
                      <Store className="w-4 h-4" /> Produto do salão
                    </button>
                    <button
                      type="button"
                      onClick={() => setUsouProprioProduto(true)}
                      className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                        usouProprioProduto
                          ? "border-violet-500 bg-violet-50 text-violet-700"
                          : "border-gray-100 bg-white text-gray-500 hover:border-violet-200"
                      }`}
                    >
                      <Package className="w-4 h-4" /> Produto próprio
                    </button>
                  </div>
                </div>
              )}

              {/* ── Action buttons by status ── */}
              <div className="space-y-2 pb-1">
                {status === "PENDENTE" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={confirmar}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
                      >
                        <Check className="w-4 h-4" /> Confirmar
                      </button>
                      <button
                        onClick={openWhatsApp}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={naoCompareceu}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors disabled:opacity-60"
                      >
                        <X className="w-4 h-4" /> Não veio
                      </button>
                      <button
                        onClick={cancelar}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
                      >
                        <X className="w-4 h-4" /> Cancelar
                      </button>
                    </div>
                  </>
                )}

                {status === "CONFIRMADO" && (
                  <>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={iniciar}
                        disabled={busy}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-60 transition-opacity"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                      >
                        <Play className="w-4 h-4" /> Iniciar
                      </button>
                      <button
                        onClick={openWhatsApp}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-emerald-500 hover:bg-emerald-600 transition-colors"
                      >
                        <MessageCircle className="w-4 h-4" /> WhatsApp
                      </button>
                    </div>
                    <button
                      onClick={cancelar}
                      disabled={busy}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-60"
                    >
                      <X className="w-4 h-4" /> Cancelar agendamento
                    </button>
                  </>
                )}

                {status === "EM_ANDAMENTO" && (
                  <button
                    onClick={concluir}
                    disabled={busy}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                    style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Concluir e registrar pagamento
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <p className="text-sm">Agendamento não encontrado</p>
          </div>
        )}
      </DialogContent>

      {/* Modal de pagamento — abre sobre o modal de detalhes */}
      {showPagamento && ag && (
        <PagamentoModal
          agendamentoId={ag.id}
          totalPrice={Number(ag.totalPrice)}
          usouProprioProduto={usouProprioProduto}
          onSuccess={() => {
            setShowPagamento(false);
            toast.success("Atendimento concluído!");
            queryClient.invalidateQueries({ queryKey: ["agendamento", id] });
            onUpdate();
            onClose();
          }}
          onClose={() => setShowPagamento(false)}
        />
      )}
    </Dialog>
  );
}
