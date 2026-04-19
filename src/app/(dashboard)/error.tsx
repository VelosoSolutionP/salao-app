"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  const isDbError =
    error.message?.toLowerCase().includes("connect") ||
    error.message?.toLowerCase().includes("timeout") ||
    error.message?.toLowerCase().includes("neon") ||
    error.message?.toLowerCase().includes("prisma");

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
      </div>
      <div>
        <h2 className="text-lg font-black text-foreground mb-1">
          {isDbError ? "Banco de dados indisponível" : "Algo deu errado"}
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          {isDbError
            ? "O banco Neon está iniciando. Aguarde alguns segundos e tente novamente."
            : "Ocorreu um erro inesperado. Tente recarregar a página."}
        </p>
      </div>
      <button
        onClick={reset}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors"
      >
        <RefreshCw className="w-4 h-4" /> Tentar novamente
      </button>
    </div>
  );
}
