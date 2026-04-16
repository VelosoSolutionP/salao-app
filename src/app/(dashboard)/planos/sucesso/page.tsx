"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PlanoSucessoPage() {
  const params   = useSearchParams();
  const router   = useRouter();
  const planoId  = params.get("plano_id");
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!planoId) { setStatus("error"); return; }
    // Pequeno delay para o webhook processar antes de verificar
    const t = setTimeout(() => setStatus("ok"), 2000);
    return () => clearTimeout(t);
  }, [planoId]);

  useEffect(() => {
    if (status === "ok") {
      const t = setTimeout(() => router.push("/clientes"), 4000);
      return () => clearTimeout(t);
    }
  }, [status, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-3xl shadow-lg p-10 max-w-sm w-full text-center">

        {status === "loading" && (
          <>
            <Loader2 className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
            <h1 className="text-lg font-bold text-gray-800">Confirmando cartão…</h1>
            <p className="text-sm text-gray-500 mt-2">Aguarde um instante.</p>
          </>
        )}

        {status === "ok" && (
          <>
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-9 h-9 text-emerald-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">Cartão salvo com sucesso!</h1>
            <p className="text-sm text-gray-500 mt-2">
              O plano mensal está ativo. A cobrança será realizada automaticamente no início de cada mês.
            </p>
            <p className="text-xs text-gray-400 mt-4">Redirecionando em instantes…</p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-9 h-9 text-red-500" />
            </div>
            <h1 className="text-lg font-bold text-gray-800">Algo deu errado</h1>
            <p className="text-sm text-gray-500 mt-2">Não foi possível confirmar o cartão.</p>
            <Link href="/clientes" className="mt-4 inline-block text-sm text-violet-600 font-semibold hover:underline">
              Voltar para clientes
            </Link>
          </>
        )}

      </div>
    </div>
  );
}
