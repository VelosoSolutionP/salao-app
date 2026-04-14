"use client";

import { useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Lock, Clock, LogOut } from "lucide-react";
import { Suspense } from "react";
import { BrandLogo } from "@/components/brand/BrandLogo";

function BloqueadoContent() {
  const params = useSearchParams();
  const motivo = params.get("motivo");

  const isTrial = motivo === "trial";

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(155deg,#0e0b1a 0%,#1a1040 55%,#0c0a18 100%)" }}
    >
      {/* Ambient blob */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(124,58,237,.08) 0%,transparent 70%)" }}
      />

      <div className="relative z-10 text-center max-w-md">
        {/* Icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          {isTrial ? (
            <Clock className="w-9 h-9 text-amber-400" />
          ) : (
            <Lock className="w-9 h-9 text-red-400" />
          )}
        </div>

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <BrandLogo size="sm" theme="dark" />
        </div>

        {/* Message */}
        {isTrial ? (
          <>
            <h1 className="text-2xl font-black text-white mb-3">
              Período de teste encerrado
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Seu período de avaliação gratuita de <strong className="text-zinc-200">30 dias</strong> chegou ao fim.
              Entre em contato com o administrador MSB para renovar o acesso e continuar usando o sistema.
            </p>
            <div
              className="rounded-2xl p-4 mb-6 text-left"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}
            >
              <p className="text-amber-400 text-xs font-black uppercase tracking-wide mb-2">Como renovar</p>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Entre em contato com a equipe TOQE para ativar seu plano e ter acesso ilimitado ao sistema.
              </p>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-black text-white mb-3">
              Acesso suspenso
            </h1>
            <p className="text-zinc-400 text-sm leading-relaxed mb-6">
              Sua conta foi temporariamente suspensa pelo administrador.
              Entre em contato com o suporte MSB para mais informações.
            </p>
          </>
        )}

        {/* Contact */}
        <div
          className="rounded-2xl p-4 mb-8"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <p className="text-zinc-500 text-xs mb-1">Suporte TOQE</p>
          <p className="text-violet-400 text-sm font-bold">contato@toqe.com.br</p>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </div>
    </div>
  );
}

export default function BloqueadoPage() {
  return (
    <Suspense>
      <BloqueadoContent />
    </Suspense>
  );
}
