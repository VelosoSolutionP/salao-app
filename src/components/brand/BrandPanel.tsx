import { BrandLogo, HeraIcon } from "./BrandLogo";

// ─── BrandPanel ───────────────────────────────────────────────────────────────
// Painel esquerdo de splash para as páginas de autenticação.
// mode="login"    → estatísticas + depoimento
// mode="registro" → passos de onboarding + depoimento

export function BrandPanel({ mode }: { mode: "login" | "registro" }) {
  return (
    <div
      className="hidden lg:flex lg:w-[54%] flex-col justify-between p-12 relative overflow-hidden"
      style={{ background: "linear-gradient(155deg,#08061a 0%,#130e30 45%,#0a0818 100%)" }}
    >
      {/* ── Ambient blobs ────────────────────────────────── */}
      <div className="absolute -top-48 -left-24 w-[520px] h-[520px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(124,58,237,.22) 0%,transparent 70%)" }} />
      <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(79,70,229,.18) 0%,transparent 70%)" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle,rgba(109,40,217,.05) 0%,transparent 70%)" }} />

      {/* ── Decorative giant icon (watermark) ───────────── */}
      <div className="absolute -right-16 top-1/2 -translate-y-1/2 pointer-events-none select-none opacity-[0.04]">
        <HeraIcon size={480} className="text-violet-300" />
      </div>

      {/* ── Precision grid lines ─────────────────────────── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.025]"
        aria-hidden
      >
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* ── Logo ─────────────────────────────────────────── */}
      <BrandLogo size="md" theme="dark" className="relative z-10" />

      {/* ── Main content ─────────────────────────────────── */}
      <div className="relative z-10 space-y-8">

        {/* Headline */}
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.2em] text-violet-500 mb-5">
            {mode === "login" ? "Painel de gestão" : "Comece agora — grátis"}
          </p>
          <h1 className="leading-[1.04] tracking-tight">
            {mode === "login" ? (
              <>
                <span className="block text-[3.2rem] font-black text-white">Gerencie.</span>
                <span
                  className="block text-[3.2rem] font-black"
                  style={{
                    background: "linear-gradient(90deg,#a78bfa 0%,#818cf8 40%,#c4b5fd 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  Cresça.
                </span>
                <span className="block text-[3.2rem] font-black text-white">Domine.</span>
              </>
            ) : (
              <>
                <span className="block text-[3.2rem] font-black text-white">Configure</span>
                <span
                  className="block text-[3.2rem] font-black"
                  style={{
                    background: "linear-gradient(90deg,#a78bfa 0%,#818cf8 40%,#c4b5fd 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  em minutos.
                </span>
                <span className="block text-[3.2rem] font-black text-white">Sem cartão.</span>
              </>
            )}
          </h1>
          <p className="text-zinc-400 mt-5 text-[15px] leading-relaxed max-w-sm">
            {mode === "login"
              ? "Agenda, equipe, estoque e finanças em um painel preciso. Para barbearias e salões masculinos e femininos."
              : "Configure seu salão em minutos. Receba agendamentos online, gerencie equipe e monitore o financeiro num só lugar."}
          </p>
        </div>

        {/* Stats ou Steps */}
        {mode === "login" ? (
          <div className="grid grid-cols-3 gap-3">
            {[
              { v: "2.4k+", l: "Agendamentos\npor mês" },
              { v: "98%",   l: "Satisfação\ndos clientes" },
              { v: "3×",    l: "Mais\nprodutividade" },
            ].map((s) => (
              <div
                key={s.v}
                className="rounded-2xl p-4"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}
              >
                <p className="text-2xl font-black text-white">{s.v}</p>
                <p className="text-xs text-zinc-500 mt-1 whitespace-pre-line leading-tight">{s.l}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {[
              { n: "01", t: "Crie sua conta",        d: "Grátis, 30 dias sem cobrança" },
              { n: "02", t: "Configure o salão",      d: "Serviços, equipe e horários" },
              { n: "03", t: "Receba agendamentos",    d: "Link de reserva online no mesmo dia" },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-3.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-black text-white mt-0.5 tabular-nums"
                  style={{ background: "rgba(124,58,237,.25)", border: "1px solid rgba(124,58,237,.4)" }}
                >
                  {s.n}
                </div>
                <div>
                  <p className="text-white text-sm font-black leading-tight">{s.t}</p>
                  <p className="text-zinc-500 text-xs mt-0.5">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Feature pills */}
        <div className="flex flex-wrap gap-2">
          {["Agenda Online","Controle de Equipe","Estoque","Financeiro","WhatsApp","Relatórios"].map((f) => (
            <span
              key={f}
              className="text-xs text-zinc-400 rounded-full px-3 py-1.5 font-medium"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
            >
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* ── Testimonial ──────────────────────────────────── */}
      <div
        className="relative z-10 rounded-2xl p-5"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        {/* Stars */}
        <div className="flex gap-1 mb-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className="w-3.5 h-3.5 text-amber-400 fill-current" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </div>

        <p className="text-zinc-300 text-sm italic leading-relaxed">
          {mode === "login"
            ? `"Reduzi o no-show em 70% com os lembretes automáticos. Tenho controle total do estoque e da equipe em tempo real."`
            : `"Em menos de 10 minutos já estava recebendo agendamentos online. A interface é linda e fácil de usar."`}
        </p>

        <div className="flex items-center gap-3 mt-4">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            {mode === "login" ? "J" : "A"}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">
              {mode === "login" ? "João Carvalho" : "Ana Beatriz"}
            </p>
            <p className="text-zinc-500 text-xs mt-0.5">
              {mode === "login" ? "Barbearia Premium · São Paulo" : "Salão Bella Arte · Rio de Janeiro"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
