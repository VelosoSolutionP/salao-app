"use client";

import { useState } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { HeraIcon } from "@/components/brand/BrandLogo";
import {
  CalendarDays, Scissors, Users, Package, DollarSign,
  Sparkles, Star, ChevronRight, BarChart3, Bell,
} from "lucide-react";

// ─── Static data ──────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: CalendarDays, label: "Agenda Online"     },
  { icon: Users,        label: "Gestão de Equipe"  },
  { icon: Package,      label: "Estoque"           },
  { icon: DollarSign,   label: "Financeiro"        },
  { icon: Scissors,     label: "Serviços"          },
  { icon: Sparkles,     label: "Transformações"    },
  { icon: BarChart3,    label: "Relatórios"        },
  { icon: Bell,         label: "Notificações"      },
  { icon: Star,         label: "Fidelidade"        },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const [tab, setTab] = useState<"salao" | "cliente">("salao");

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden"
      style={{ background: "linear-gradient(155deg,#08061a 0%,#130e30 45%,#0a0818 100%)" }}
    >

      {/* ── Ambient glows ─────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,.20) 0%,transparent 65%)", filter: "blur(4px)" }} />
        <div className="absolute -bottom-48 -right-32 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(79,70,229,.16) 0%,transparent 65%)", filter: "blur(4px)" }} />
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] rounded-full"
          style={{ background: "radial-gradient(circle,rgba(109,40,217,.07) 0%,transparent 70%)" }} />
      </div>

      {/* ── Grid pattern ─────────────────────────────────────────────────── */}
      <svg className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.025]" aria-hidden>
        <defs>
          <pattern id="g" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#g)" />
      </svg>

      {/* ── Watermark crown ──────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute right-0 top-1/2 -translate-y-1/2 -translate-x-8 opacity-[0.03] select-none">
        <HeraIcon size={520} className="text-violet-300" />
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONTENT                                                             */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <div className="relative z-10 w-full max-w-md mx-auto px-5 py-12 lg:py-16 flex flex-col items-center gap-8">

        {/* ── Brand ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center gap-5 text-center">
          {/* Icon with multi-layer glow */}
          <div className="relative">
            <div
              className="absolute inset-0 rounded-3xl blur-xl opacity-70"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", transform: "scale(1.4)" }}
            />
            <div
              className="relative w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                boxShadow: "0 0 0 1px rgba(124,58,237,.4), 0 0 0 4px rgba(124,58,237,.12), 0 12px 48px rgba(124,58,237,.6)",
              }}
            >
              <HeraIcon size={30} className="text-white" />
            </div>
          </div>

          {/* Name with gradient */}
          <div>
            <p
              className="font-black tracking-tight leading-none"
              style={{
                fontSize: "clamp(2.2rem, 8vw, 3rem)",
                background: "linear-gradient(135deg, #ffffff 0%, #e9d5ff 40%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Hera
            </p>
            <p className="text-zinc-500 text-xs font-black uppercase tracking-[.22em] mt-2">
              Gestão de Salões
            </p>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* ACCESS CARD                                                     */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div
          className="w-full max-w-md rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.09)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 8px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.07)",
          }}
        >
          {/* ── Tab switcher ────────────────────────────────── */}
          <div
            className="flex p-1.5 gap-1.5"
            style={{ background: "rgba(0,0,0,.25)", borderBottom: "1px solid rgba(255,255,255,.06)" }}
          >
            <TabBtn active={tab === "salao"} onClick={() => setTab("salao")}>
              <Scissors className="w-3.5 h-3.5" />
              Salão / Equipe
            </TabBtn>
            <TabBtn active={tab === "cliente"} onClick={() => setTab("cliente")} amber>
              <CalendarDays className="w-3.5 h-3.5" />
              Sou cliente
            </TabBtn>
          </div>

          {/* ── Tab body ────────────────────────────────────── */}
          <div className="p-6 lg:p-7">
            {tab === "salao" ? (
              <>
                <div className="mb-6">
                  <h2 className="text-white font-black text-xl leading-tight">Bem-vindo de volta!</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    Acesse o painel de gestão do seu salão.
                  </p>
                </div>

                <LoginForm dark />

                <p className="text-center text-xs text-zinc-600 mt-5">
                  Proprietário sem conta?{" "}
                  <Link href="/registro" className="text-violet-400 hover:text-violet-300 font-bold transition-colors">
                    Cadastrar salão grátis
                  </Link>
                </p>
              </>
            ) : (
              <>
                <div className="mb-6">
                  <h2 className="text-white font-black text-xl leading-tight">Área do cliente</h2>
                  <p className="text-zinc-500 text-sm mt-1">
                    Acesse seus agendamentos e histórico.
                  </p>
                </div>

                <LoginForm dark callbackUrl="/agendar" />

                {/* OR: book without account */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.07)" }} />
                  <span className="text-xs text-zinc-600 font-semibold">ou</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,.07)" }} />
                </div>

                <Link
                  href="/agendar"
                  className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg,rgba(217,119,6,.2),rgba(180,83,9,.2))",
                    border: "1px solid rgba(217,119,6,.3)",
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
                    <p className="text-xs text-amber-700 mt-0.5">Escolha um salão e reserve agora</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-amber-600 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
                </Link>
              </>
            )}
          </div>
        </div>

        {/* ── Feature pills ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {FEATURES.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-zinc-400"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
            >
              <Icon className="w-3 h-3 text-violet-500" />
              {label}
            </div>
          ))}
        </div>

        {/* ── Testimonial ───────────────────────────────────────────────── */}
        <div
          className="w-full max-w-md rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex gap-0.5 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            ))}
          </div>
          <p className="text-zinc-300 text-sm italic leading-relaxed">
            "Reduzi o no-show em 70% com os lembretes automáticos. Tenho controle total do estoque e da equipe em tempo real."
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            >
              J
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">João Carvalho</p>
              <p className="text-zinc-500 text-xs mt-0.5">Barbearia Premium · São Paulo</p>
            </div>
          </div>
        </div>

        <p className="text-zinc-700 text-[11px] pb-4">
          © {new Date().getFullYear()} Hera · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}

// ─── TabBtn ───────────────────────────────────────────────────────────────────

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
                background: "linear-gradient(135deg,rgba(217,119,6,.35),rgba(180,83,9,.3))",
                color: "#fcd34d",
                boxShadow: "0 2px 12px rgba(217,119,6,.2)",
                border: "1px solid rgba(217,119,6,.35)",
              }
            : {
                background: "linear-gradient(135deg,rgba(124,58,237,.35),rgba(79,70,229,.3))",
                color: "#c4b5fd",
                boxShadow: "0 2px 12px rgba(124,58,237,.25)",
                border: "1px solid rgba(124,58,237,.4)",
              }
          : { color: "#52525b", border: "1px solid transparent" }
      }
    >
      {children}
    </button>
  );
}
