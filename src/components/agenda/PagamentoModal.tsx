"use client";
import { errMsg } from "@/lib/api-error";

/**
 * PagamentoModal
 *
 * Conclui um atendimento e registra o pagamento.
 * Métodos:
 *   • Dinheiro / Transferência / Cartão → registro manual
 *   • PIX → cobrança Woovi com QR code (polling de status)
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatBRL } from "@/lib/utils";
import {
  Banknote, ArrowLeftRight, Smartphone, CreditCard,
  Loader2, CheckCircle2, ChevronRight, ArrowLeft, Copy, Check,
} from "lucide-react";

/* ─── Métodos ──────────────────────────────────────────────────────────────── */
type Metodo = "DINHEIRO" | "TRANSFERENCIA" | "PIX" | "CARTAO_CREDITO" | "CARTAO_DEBITO";

const METODOS: { key: Metodo; label: string; Icon: React.ElementType; color: string; pix?: boolean }[] = [
  { key: "DINHEIRO",       label: "Dinheiro",  Icon: Banknote,       color: "#16a34a" },
  { key: "TRANSFERENCIA",  label: "Transfer.", Icon: ArrowLeftRight, color: "#2563eb" },
  { key: "PIX",            label: "PIX",       Icon: Smartphone,     color: "#0891b2", pix: true },
  { key: "CARTAO_CREDITO", label: "Crédito",   Icon: CreditCard,     color: "#7c3aed" },
  { key: "CARTAO_DEBITO",  label: "Débito",    Icon: CreditCard,     color: "#9333ea" },
];

/* ─── QR Code PIX (Woovi) ──────────────────────────────────────────────────── */
function PixWooviStep({
  agendamentoId,
  totalPrice,
  usouProprioProduto,
  onSuccess,
}: {
  agendamentoId: string;
  totalPrice: number;
  usouProprioProduto: boolean;
  onSuccess: () => void;
}) {
  const [loading, setLoading]     = useState(true);
  const [brCode, setBrCode]       = useState("");
  const [qrImg, setQrImg]         = useState("");
  const [copied, setCopied]       = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetch("/api/pagamentos/pix", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agendamentoId }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { toast.error(d.error); return; }
        setBrCode(d.brCode ?? "");
        setQrImg(d.qrCodeImage ?? "");
      })
      .catch(() => toast.error("Erro ao gerar QR code PIX"))
      .finally(() => setLoading(false));
  }, [agendamentoId]);

  const handleCopy = () => {
    navigator.clipboard.writeText(brCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      await fetch(`/api/agendamentos/${agendamentoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CONCLUIDO",
          pagamento: "PIX",
          pagamentoStatus: "PAGO",
          usouProprioProduto,
        }),
      });
      onSuccess();
    } catch {
      toast.error("Erro ao confirmar pagamento");
      setConfirming(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-10">
        <Loader2 className="w-7 h-7 animate-spin text-cyan-500" />
        <p className="text-sm text-muted-foreground">Gerando QR code PIX…</p>
      </div>
    );
  }

  if (!brCode) {
    return (
      <p className="text-sm text-red-500 text-center py-6">
        Chave PIX não configurada. Configure em Configurações do salão.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Code */}
      <div className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrImg} alt="QR Code PIX" width={192} height={192} className="rounded-xl" />
      </div>

      {/* Valor */}
      <p className="text-sm text-muted-foreground">
        Valor: <span className="font-bold text-foreground">{formatBRL(totalPrice)}</span>
      </p>

      {/* Copia e Cola */}
      <button
        type="button"
        onClick={handleCopy}
        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted border border-border hover:border-cyan-400 transition-all"
      >
        <span className="flex-1 text-xs text-muted-foreground truncate text-left font-mono">
          {brCode.slice(0, 48)}…
        </span>
        {copied
          ? <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
          : <Copy className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        }
      </button>

      {/* Confirmação manual */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={confirming}
        className="w-full py-3 rounded-xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all disabled:opacity-60"
        style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 16px -4px rgba(16,185,129,0.5)" }}
      >
        {confirming
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <CheckCircle2 className="w-4 h-4" />
        }
        Confirmar Recebimento PIX
      </button>

      <p className="text-xs text-muted-foreground text-center">
        Após confirmar o pagamento no seu app Inter, clique acima.
      </p>
    </div>
  );
}

/* ─── Modal principal ──────────────────────────────────────────────────────── */
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
  const [metodo, setMetodo]         = useState<Metodo | null>(null);
  const [manualLoading, setManualLoading] = useState(false);
  const [done, setDone]             = useState(false);

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
    if (data.error) { toast.error(errMsg(data.error)); return; }
    setDone(true);
    setTimeout(onSuccess, 1200);
  }, [metodo, agendamentoId, usouProprioProduto, onSuccess]);

  const handlePixSuccess = useCallback(() => {
    setDone(true);
    setTimeout(onSuccess, 1200);
  }, [onSuccess]);

  const metodoInfo = METODOS.find((m) => m.key === metodo);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent showCloseButton={false} className="max-w-md p-0 gap-0 overflow-hidden">
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
              onClick={() => setMetodo(null)}
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

          {/* PIX — Woovi QR */}
          {metodo === "PIX" && !done && (
            <PixWooviStep
              agendamentoId={agendamentoId}
              totalPrice={totalPrice}
              usouProprioProduto={usouProprioProduto}
              onSuccess={handlePixSuccess}
            />
          )}

          {/* Manual — dinheiro, transferência, cartão */}
          {metodo && metodo !== "PIX" && metodoInfo && !done && (
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

        </div>
      </DialogContent>
    </Dialog>
  );
}
