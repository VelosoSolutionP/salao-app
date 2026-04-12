import type { Metadata } from "next";
import Link from "next/link";
import { RegistroForm } from "@/components/auth/RegistroForm";

export const metadata: Metadata = { title: "Criar Conta — MSB Solution" };

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Brand panel ────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[54%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(155deg,#0e0b1a 0%,#1a1040 55%,#0c0a18 100%)" }}
      >
        {/* Ambient blobs */}
        <div className="absolute -top-48 -left-24 w-[520px] h-[520px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(124,58,237,.18) 0%,transparent 70%)" }} />
        <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(79,70,229,.15) 0%,transparent 70%)" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle,rgba(109,40,217,.06) 0%,transparent 70%)" }} />

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              boxShadow: "0 0 0 1px rgba(124,58,237,.3),0 4px 24px rgba(124,58,237,.5)",
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 text-white">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight tracking-tight">MSB Solution</p>
            <p className="text-violet-400/70 text-[10px] font-semibold tracking-widest uppercase mt-0.5">Gestão de Salões</p>
          </div>
        </div>

        {/* Headline */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="leading-[1.05] tracking-tight">
              <span className="block text-[3rem] font-black text-white">Comece hoje</span>
              <span
                className="block text-[3rem] font-black"
                style={{
                  background: "linear-gradient(90deg,#a78bfa 0%,#818cf8 50%,#c4b5fd 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                de graça
              </span>
              <span className="block text-[3rem] font-black text-white">sem cartão.</span>
            </h1>
            <p className="text-zinc-400 mt-5 text-[15px] leading-relaxed max-w-sm">
              Configure seu salão em minutos. Agenda online, controle de equipe,
              financeiro e relatórios num só lugar.
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {[
              { n: "1", t: "Crie sua conta", d: "Grátis, sem cartão de crédito" },
              { n: "2", t: "Configure seu salão", d: "Serviços, equipe e horários" },
              { n: "3", t: "Receba agendamentos", d: "Link de reserva online no mesmo dia" },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-black text-white mt-0.5"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                >
                  {s.n}
                </div>
                <div>
                  <p className="text-white text-sm font-bold leading-tight">{s.t}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap gap-2">
            {[
              "✂️ Masc & Fem",
              "📦 Estoque",
              "💰 Financeiro",
              "📅 Agenda online",
              "🔔 WhatsApp",
              "📊 Relatórios",
            ].map((f) => (
              <span
                key={f}
                className="text-xs text-zinc-400 rounded-full px-3 py-1.5 font-medium"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <div
          className="relative z-10 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          <div className="flex gap-1 mb-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
              </svg>
            ))}
          </div>
          <p className="text-zinc-300 text-sm italic leading-relaxed">
            "Em menos de 10 minutos já estava recebendo agendamentos online. A interface é linda e fácil de usar."
          </p>
          <div className="flex items-center gap-3 mt-4">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            >
              A
            </div>
            <div>
              <p className="text-white text-sm font-semibold leading-tight">Ana Beatriz</p>
              <p className="text-zinc-500 text-xs mt-0.5">Salão Bella Arte · Rio de Janeiro</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT: Form panel ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 lg:px-16 overflow-y-auto">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4.5 h-4.5">
              <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
              <line x1="20" y1="4" x2="8.12" y2="15.88"/>
              <line x1="14.47" y1="14.48" x2="20" y2="20"/>
              <line x1="8.12" y1="8.12" x2="12" y2="12"/>
            </svg>
          </div>
          <span className="font-black text-gray-900 text-base tracking-tight">MSB Solution</span>
        </div>

        <div className="w-full max-w-sm mx-auto">
          {/* Header */}
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">MSB Solution</p>
            <h2 className="text-[2rem] font-black text-gray-900 tracking-tight leading-tight">
              Crie sua conta
            </h2>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              Comece a gerenciar seu salão hoje mesmo, de graça.
            </p>
          </div>

          <RegistroForm />

          <p className="text-center text-sm text-gray-400 mt-6">
            Já tem conta?{" "}
            <Link href="/login" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">
              Entrar
            </Link>
          </p>

          {/* Footer */}
          <p className="text-center text-[11px] text-gray-300 mt-8">
            © {new Date().getFullYear()} MSB Solution · Todos os direitos reservados
          </p>
        </div>
      </div>

    </div>
  );
}
