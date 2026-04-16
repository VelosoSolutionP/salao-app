"use client";

/**
 * PagamentoModal
 *
 * Abre na conclusão de um atendimento (status EM_ANDAMENTO → CONCLUIDO).
 * Métodos disponíveis:
 *   • Dinheiro / Transferência → registra manualmente, sem Stripe
 *   • PIX / Cartão → cria PaymentIntent e processa via Stripe Elements
 *
 * Props:
 *   agendamentoId  — ID do agendamento
 *   totalPrice     — valor do atendimento (number)
 *   usouProprioProduto — flag para cálculo de comissão
 *   onSuccess      — callback quando pagamento é confirmado
 *   onClose        — fechar o modal
 */

import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogTitle,
} from "@/components/ui/dialog";
import { loadStripe } from "@stripe/stripe-js";
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from "@stripe/react-stripe-js";
import { toast } from "sonner";
import { formatBRL } from "@/lib/utils";
import {
  Banknote, ArrowLeftRight, Smartphone, CreditCard,
  Loader2, CheckCircle2, ChevronRight, ArrowLeft,
} from "lucide-react";

/* ─── Stripe init ──────────────────────────────────────────────────────────── */
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? ""
);

/* ─── Métodos de pagamento ─────────────────────────────────────────────────── */
type Metodo = "DINHEIRO" | "TRANSFERENCIA" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO";

const METODOS: { key: Metodo; label: string; Icon: React.ElementType; stripe: boolean; color: string }[] = [
  { key: "DINHEIRO",       label: "Dinheiro",   Icon: Banknote,       stripe: false, color: "#16a34a" },
  { key: "TRANSFERENCIA",  label: "Transfer.",  Icon: ArrowLeftRight, stripe: false, color: "#2563eb" },
  { key: "PIX",            label: "PIX",        Icon: Smartphone,     stripe: true,  color: "#0891b2" },
  { key: "CARTAO_CREDITO", label: "Crédito",    Icon: CreditCard,     stripe: true,  color: "#7c3aed" },
  { key: "CARTAO_DEBITO",  label: "Débito",     Icon: CreditCard,     stripe: true,  color: "#9333ea" },
];

/* ─── Stripe payment form ──────────────────────────────────────────────────── */
function StripeForm({
  clientSecret,
  metodo,
  agendamentoId,
  usouProprioProduto,
  onSuccess,
}: {
  clientSecret: string;
  metodo: Metodo;
  agendamentoId: string;
  usouProprioProduto: boolean;
  onSuccess: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    if (!stripe || !elements) return;
    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });

    if (error) {
      toast.error(error.message ?? "Erro no pagamento");
      setLoading(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      // Confirma no servidor — o webhook também faz isso, mas aqui é mais imediato
      await fetch(`/api/agendamentos/${agendamentoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONCLUIDO",
          pagamento: metodo,
          pagamentoStatus: "PAGO",
          usouProprioProduto,
          stripePaymentIntentId: paymentIntent.id,
        }),
      });
      onSuccess();
    } else {
      toast.error("Pagamento ainda não confirmado. Aguarde ou tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement options={{ layout: "tabs" }} />
      <button
        type="button"
        onClick={handlePay}
        disabled={loading || !stripe}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
        {loading ? "Processando…" : "Confirmar pagamento"}
      </button>
    </div>
  );
}

/* ─── Main modal ───────────────────────────────────────────────────────────── */
export function PagamentoModal({
  agendamentoId,
  totalPrice,
  usouProprioProduto,
  onSuccess,
  onClose,
}: {
  agendamentoId: string;
  totalPrice: number;
  usouProprioProduto: boolean;
  onSuccess: () => void;
  onClose: () => void;
}) {
  const [metodo, setMetodo]             = useState<Metodo | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);
  const [done, setDone]                 = useState(false);

  /* Cria PaymentIntent quando método Stripe é selecionado */
  useEffect(() => {
    if (!metodo) return;
    const m = METODOS.find((x) => x.key === metodo);
    if (!m?.stripe) { setClientSecret(null); return; }

    setLoadingIntent(true);
    fetch("/api/pagamentos/intencao", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agendamentoId }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.clientSecret) setClientSecret(d.clientSecret); })
      .catch(() => toast.error("Erro ao iniciar pagamento"))
      .finally(() => setLoadingIntent(false));
  }, [metodo, agendamentoId]);

  /* Pagamento manual (dinheiro / transferência) */
  const handleManual = useCallback(async () => {
    if (!metodo) return;
    setManualLoading(true);
    const res = await fetch(`/api/agendamentos/${agendamentoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "CONCLUIDO",
        pagamento: metodo,
        pagamentoStatus: "PAGO",
        usouProprioProduto,
      }),
    });
    const data = await res.json();
    setManualLoading(false);
    if (data.error) { toast.error(data.error); return; }
    setDone(true);
    setTimeout(onSuccess, 1200);
  }, [metodo, agendamentoId, usouProprioProduto, onSuccess]);

  const handleStripeSuccess = useCallback(() => {
    setDone(true);
    setTimeout(onSuccess, 1200);
  }, [onSuccess]);

  const metodoInfo = METODOS.find((m) => m.key === metodo);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        showCloseButton={false}
        className="max-w-md p-0 gap-0 overflow-hidden"
      >
        <DialogTitle className="sr-only">Pagamento do atendimento</DialogTitle>

        {/* Header */}
        <div
          className="px-6 py-5 relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
        >
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full pointer-events-none" />
          {metodo && !done && (
            <button
              type="button"
              onClick={() => { setMetodo(null); setClientSecret(null); }}
              className="absolute top-3 left-3 w-7 h-7 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-white" />
            </button>
          )}
          <div className="text-center relative">
            <p className="text-white/70 text-xs font-semibold uppercase tracking-widest mb-1">
              Total do atendimento
            </p>
            <p className="text-white text-3xl font-black">{formatBRL(totalPrice)}</p>
          </div>
        </div>

        <div className="p-6">

          {/* Sucesso */}
          {done && (
            <div className="flex flex-col items-center gap-3 py-6">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center">
                <CheckCircle2 className="w-9 h-9 text-emerald-500" />
              </div>
              <p className="text-lg font-bold text-gray-800">Pagamento confirmado!</p>
              <p className="text-sm text-gray-500">Atendimento concluído com sucesso.</p>
            </div>
          )}

          {/* Seleção de método */}
          {!metodo && !done && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
                Forma de pagamento
              </p>
              {METODOS.map(({ key, label, Icon, color }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setMetodo(key)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all group"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: `${color}1a` }}
                  >
                    <Icon className="w-5 h-5" style={{ color }} />
                  </div>
                  <span className="flex-1 text-sm font-semibold text-gray-700 text-left">{label}</span>
                  <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Pagamento manual */}
          {metodo && metodoInfo && !metodoInfo.stripe && !done && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-gray-50 border border-gray-100">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${metodoInfo.color}1a` }}
                >
                  <metodoInfo.Icon className="w-5 h-5" style={{ color: metodoInfo.color }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{metodoInfo.label}</p>
                  <p className="text-xs text-gray-500">{formatBRL(totalPrice)}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleManual}
                disabled={manualLoading}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold text-white disabled:opacity-60 transition-opacity"
                style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
              >
                {manualLoading
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle2 className="w-4 h-4" />
                }
                {manualLoading ? "Registrando…" : "Confirmar recebimento"}
              </button>
            </div>
          )}

          {/* Stripe Elements */}
          {metodo && metodoInfo?.stripe && !done && (
            <div>
              {loadingIntent || !clientSecret ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
                </div>
              ) : (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: {
                      theme: "stripe",
                      variables: {
                        colorPrimary: "#7c3aed",
                        borderRadius: "12px",
                        fontFamily: "Inter, sans-serif",
                      },
                    },
                    locale: "pt-BR",
                  }}
                >
                  <StripeForm
                    clientSecret={clientSecret}
                    metodo={metodo}
                    agendamentoId={agendamentoId}
                    usouProprioProduto={usouProprioProduto}
                    onSuccess={handleStripeSuccess}
                  />
                </Elements>
              )}
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}
