import type { Metadata } from "next";
import Link from "next/link";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CalendarDays, Star, Shield } from "lucide-react";

export const metadata: Metadata = { title: "Criar Conta — Bellefy" };

const perks = [
  { icon: CalendarDays, text: "Agende serviços em poucos cliques" },
  { icon: Star,         text: "Histórico e fidelidade em um só lugar" },
  { icon: Shield,       text: "Seus dados protegidos com segurança" },
];

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: decorative panel ─────────────────────────── */}
      <div
        className="hidden lg:flex flex-col justify-between w-[44%] flex-shrink-0 px-14 py-16 relative overflow-hidden"
        style={{ background: "linear-gradient(150deg,#07051c 0%,#100a2a 55%,#07051a 100%)" }}
      >
        {/* ambient blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div style={{ position:"absolute", top:"-20%", left:"-15%", width:"70vw", height:"70vw", borderRadius:"50%", background:"radial-gradient(circle,rgba(109,40,217,.25) 0%,transparent 60%)", filter:"blur(2px)" }}/>
          <div style={{ position:"absolute", bottom:"-20%", right:"-10%", width:"55vw", height:"55vw", borderRadius:"50%", background:"radial-gradient(circle,rgba(79,70,229,.18) 0%,transparent 60%)", filter:"blur(2px)" }}/>
        </div>

        <BrandLogo size="sm" theme="dark" />

        <div className="relative z-10 space-y-10">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.22em] text-violet-400 mb-4">
              Bem-vindo ao Bellefy
            </p>
            <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
              O melhor jeito de<br />
              cuidar de você
            </h1>
            <p className="text-zinc-400 mt-4 text-sm leading-relaxed max-w-xs">
              Crie sua conta gratuitamente e acesse os melhores salões e barbearias da sua cidade.
            </p>
          </div>

          <div className="space-y-4">
            {perks.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.25)" }}>
                  <Icon className="w-4 h-4 text-violet-400" />
                </div>
                <p className="text-sm text-zinc-300 font-medium">{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-zinc-700 text-xs">
          © {new Date().getFullYear()} Bellefy · Todos os direitos reservados
        </p>
      </div>

      {/* ── RIGHT: form ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 lg:px-16 overflow-y-auto">

        <div className="lg:hidden mb-10">
          <BrandLogo size="sm" theme="light" />
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">
              Cadastro de cliente
            </p>
            <h2 className="text-[2rem] font-black text-gray-900 tracking-tight leading-tight">
              Criar nova conta
            </h2>
            <p className="text-gray-400 mt-2 text-sm">
              Preencha seus dados para começar a agendar.
            </p>
          </div>

          <RegistroForm />

          <p className="text-center text-sm text-gray-400 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">
              Entrar
            </Link>
          </p>
        </div>
      </div>

    </div>
  );
}
