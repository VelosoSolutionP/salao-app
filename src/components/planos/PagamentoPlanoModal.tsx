"use client";
import { errMsg } from "@/lib/api-error";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Copy, QrCode } from "lucide-react";

interface PagamentoPlanoModalProps {
  open: boolean;
  onClose: () => void;
  planoTipo: string;
  planoNome: string;
  preco: number;
}

export function PagamentoPlanoModal({ open, onClose, planoTipo, planoNome, preco }: PagamentoPlanoModalProps) {
  const [step, setStep] = useState<"idle" | "loading" | "qr" | "confirming" | "done">("idle");
  const [qrData, setQrData] = useState<{ qrCodeImage: string; brCode: string; pagamentoId: string } | null>(null);

  async function gerarPix() {
    setStep("loading");
    try {
      const res = await fetch("/api/contrato/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plano: planoTipo }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(errMsg(data.error, "Erro ao gerar PIX")); setStep("idle"); return; }
      setQrData(data);
      setStep("qr");
    } catch {
      toast.error("Erro de conexão"); setStep("idle");
    }
  }

  async function confirmarPagamento() {
    if (!qrData) return;
    setStep("confirming");
    try {
      const res = await fetch("/api/contrato/pix", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pagamentoId: qrData.pagamentoId }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(errMsg(data.error, "Erro ao confirmar")); setStep("qr"); return; }
      setStep("done");
      toast.success("Pagamento confirmado! Seu plano está ativo.");
    } catch {
      toast.error("Erro de conexão"); setStep("qr");
    }
  }

  function handleClose() {
    setStep("idle");
    setQrData(null);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assinar Plano {planoNome}</DialogTitle>
        </DialogHeader>

        {step === "idle" && (
          <div className="space-y-4 mt-2">
            <div className="bg-violet-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-black text-violet-700">R$ {preco}<span className="text-sm font-normal text-violet-400">/mês</span></p>
              <p className="text-xs text-violet-500 mt-1">Pagamento via PIX · Inter</p>
            </div>
            <Button className="w-full gap-2 bg-violet-600 hover:bg-violet-700" onClick={gerarPix}>
              <QrCode className="w-4 h-4" /> Gerar QR Code PIX
            </Button>
          </div>
        )}

        {step === "loading" && (
          <div className="flex flex-col items-center py-8 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <p className="text-sm text-gray-500">Gerando QR Code...</p>
          </div>
        )}

        {(step === "qr" || step === "confirming") && qrData && (
          <div className="space-y-4 mt-2">
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrData.qrCodeImage} alt="QR Code PIX" className="w-48 h-48 rounded-xl border border-gray-200" />
              <p className="text-xs text-gray-500 text-center">Escaneie com o app do banco</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 mb-1 font-medium uppercase tracking-wider">Copia e cola PIX</p>
              <p className="text-xs font-mono text-gray-700 break-all line-clamp-2">{qrData.brCode}</p>
              <button
                onClick={() => { navigator.clipboard.writeText(qrData.brCode); toast.success("Copiado!"); }}
                className="mt-2 flex items-center gap-1.5 text-violet-600 text-xs font-semibold hover:text-violet-700"
              >
                <Copy className="w-3.5 h-3.5" /> Copiar código
              </button>
            </div>

            <Button
              className="w-full gap-2 bg-emerald-600 hover:bg-emerald-700"
              onClick={confirmarPagamento}
              disabled={step === "confirming"}
            >
              {step === "confirming" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Confirmar Recebimento PIX
            </Button>
            <p className="text-[11px] text-gray-400 text-center">Clique após realizar o pagamento</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center py-8 gap-4">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <p className="font-bold text-gray-900">Plano {planoNome} ativado!</p>
            <p className="text-sm text-gray-500 text-center">Seu acesso foi liberado. Recarregue a página para ver as mudanças.</p>
            <Button className="w-full" onClick={() => window.location.reload()}>Recarregar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
