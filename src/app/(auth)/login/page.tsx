"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BellefyIcon } from "@/components/brand/BrandLogo";
import { CalendarDays, Scissors, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const [tab, setTab] = useState<"salao" | "cliente">("cliente");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5 py-12"
      style={{ background: "linear-gradient(155deg,#08061a 0%,#130e30 45%,#0a0818 100%)" }}
    >
      {/* Glows */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 65%)", filter: "blur(4px)" }} />
        <div className="absolute -bottom-48 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(79,70,229,.18) 0%,transparent 65%)", filter: "blur(4px)" }} />
      </div>

      {/* Grid */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.025]" aria-hidden>
        <defs>
          <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      {/* Watermark */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 opacity-[0.025] select-none">
        <BellefyIcon size={480} className="text-violet-300" />
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

        {/* Brand */}
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-60"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", transform: "scale(1.5)" }}
            />
            <div
              className="relative w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                boxShadow: "0 0 0 1px rgba(124,58,237,.4), 0 0 0 5px rgba(124,58,237,.1), 0 16px 48px rgba(124,58,237,.55)",
              }}
            >
              <BellefyIcon size={30} className="text-white" />
            </div>
          </div>

          <div>
            <p
              className="font-black tracking-tight leading-none"
              style={{
                fontSize: "2.8rem",
                background: "linear-gradient(135deg,#ffffff 0%,#e9d5ff 45%,#a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Bellefy
            </p>
            <p className="text-zinc-500 text-[11px] font-black uppercase tracking-[.22em] mt-1.5">
              Gestão de Salões
            </p>
          </div>
        </div>

        {/* Card */}
        <div
          className="w-full rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 8px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)",
          }}
        >
          {/* Tabs */}
          <div
            className="flex p-1.5 gap-1.5"
            style={{ background: "rgba(0,0,0,.3)", borderBottom: "1px solid rgba(255,255,255,.06)" }}
          >
            <TabBtn active={tab === "cliente"} onClick={() => setTab("cliente")} amber>
              <CalendarDays className="w-3.5 h-3.5" />
              Sou cliente
            </TabBtn>
            <TabBtn active={tab === "salao"} onClick={() => setTab("salao")}>
              <Scissors className="w-3.5 h-3.5" />
              Salão / Equipe
            </TabBtn>
          </div>

          {/* Body */}
          <div className="p-6">
            {tab === "salao" ? (
              <>
                <div className="mb-5">
                  <h2 className="text-white font-black text-lg leading-tight">Bem-vindo de volta!</h2>
                  <p className="text-zinc-500 text-sm mt-0.5">Acesse o painel do seu salão.</p>
                </div>

                <LoginForm dark />

                <p className="text-center text-xs text-zinc-600 mt-5">
                  Sem conta?{" "}
                  <Link href="/registro" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
                    Cadastrar salão grátis
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="mb-5">
                  <h2 className="text-white font-black text-lg leading-tight">Área do cliente</h2>
                  <p className="text-zinc-500 text-sm mt-0.5">Acesse seus agendamentos.</p>
                </div>

                <LoginForm dark callbackUrl="/agendar" />

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.06)" }} />
                  <span className="text-[11px] text-zinc-600 font-semibold">ou</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.06)" }} />
                </div>

                <Link
                  href="/agendar"
                  className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,rgba(217,119,6,.18),rgba(180,83,9,.18))",
                    border: "1px solid rgba(217,119,6,.28)",
                  }}
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}
                  >
                    <CalendarDays className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-amber-300">Agendar sem conta</p>
                    <p className="text-xs text-amber-700/80 mt-0.5">Escolha um salão e reserve agora</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-700 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-zinc-700 text-[11px] text-center leading-relaxed">
          <span className="text-zinc-500 font-semibold">Bellefy</span>
          {" · "}Gestão de Salões
        </p>
      </div>
    </div>
  );
}

function TabBtn({
  children, active, onClick, amber,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  amber?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
      style={
        active
          ? amber
            ? {
                background: "linear-gradient(135deg,rgba(217,119,6,.3),rgba(180,83,9,.25))",
                color: "#fcd34d",
                boxShadow: "0 2px 12px rgba(217,119,6,.18)",
                border: "1px solid rgba(217,119,6,.32)",
              }
            : {
                background: "linear-gradient(135deg,rgba(124,58,237,.32),rgba(79,70,229,.28))",
                color: "#c4b5fd",
                boxShadow: "0 2px 12px rgba(124,58,237,.22)",
                border: "1px solid rgba(124,58,237,.38)",
              }
          : { color: "#52525b", border: "1px solid transparent" }
      }
    >
      {children}
    </button>
  );
}
