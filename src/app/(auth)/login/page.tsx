"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BellefyIcon } from "@/components/brand/BrandLogo";
import { CalendarDays, Scissors, ChevronRight } from "lucide-react";

/* ─── Keyframes & font injected once ───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@700;800&display=swap');

  @keyframes bf-float {
    0%,100% { transform: translateY(0)    rotate(0deg)   scale(1); }
    33%      { transform: translateY(-16px) rotate(7deg)  scale(1.03); }
    66%      { transform: translateY(9px)   rotate(-4deg) scale(.98); }
  }
  @keyframes bf-float2 {
    0%,100% { transform: translateY(0)    rotate(45deg)  scale(1); }
    50%      { transform: translateY(-22px) rotate(53deg) scale(1.05); }
  }
  @keyframes bf-pulse {
    0%,100% { opacity:.15; transform:scale(1); }
    50%     { opacity:.28; transform:scale(1.07); }
  }
  @keyframes bf-in {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes bf-in2 {
    from { opacity:0; transform:translateY(18px) scale(.98); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }
  @keyframes bf-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .bf-brand  { animation: bf-in  .65s cubic-bezier(.22,1,.36,1) both; }
  .bf-card   { animation: bf-in2 .65s cubic-bezier(.22,1,.36,1) .14s both; }
  .bf-footer { animation: bf-in  .5s  ease               .32s  both; }

  .bf-wordmark {
    font-family: 'Outfit', sans-serif;
    font-weight: 800;
    font-size: 1.9rem;
    line-height: 1;
    letter-spacing: -.02em;
    color: #fff;
    text-shadow:
      0 1px 0 rgba(167,139,250,.9),
      0 2px 0 rgba(124,58,237,.7),
      0 4px 0 rgba(109,40,217,.5),
      0 6px 12px rgba(79,46,120,.55),
      0 12px 28px rgba(0,0,0,.35);
  }
`;

export default function LoginPage() {
  const [tab, setTab] = useState<"salao" | "cliente">("cliente");
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5 py-14"
        style={{ background: "linear-gradient(150deg,#07051c 0%,#100a2a 55%,#07051a 100%)" }}
      >
        {/* ── Ambient depth ─────────────────────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* primary glow */}
          <div style={{
            position:"absolute", top:"-28%", left:"-18%",
            width:"72vw", height:"72vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(109,40,217,.28) 0%,transparent 60%)",
            filter:"blur(1px)",
          }}/>
          {/* secondary glow */}
          <div style={{
            position:"absolute", bottom:"-22%", right:"-12%",
            width:"60vw", height:"60vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(79,70,229,.2) 0%,transparent 60%)",
            filter:"blur(1px)",
          }}/>
          {/* accent glow right */}
          <div style={{
            position:"absolute", top:"30%", right:"-5%",
            width:"30vw", height:"30vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(167,139,250,.1) 0%,transparent 65%)",
          }}/>

          {/* ── Floating 3-D diamonds ───────────────────────── */}
          {[
            { top:"12%", right:"9%",  size:56, delay:"0s",   duration:"9s",  anim:"bf-float",  opacity:.22 },
            { top:"68%", left:"6%",   size:36, delay:"1.5s", duration:"11s", anim:"bf-float2", opacity:.18 },
            { top:"42%", right:"14%", size:22, delay:"3s",   duration:"7s",  anim:"bf-float",  opacity:.14 },
            { top:"20%", left:"11%",  size:16, delay:"2s",   duration:"8s",  anim:"bf-float2", opacity:.12 },
          ].map((o, i) => (
            <div key={i} style={{
              position:"absolute", top:o.top,
              ...(o.right ? {right:o.right} : {left:o.left}),
              width:o.size, height:o.size,
              background:"linear-gradient(135deg,rgba(124,58,237,.35),rgba(79,70,229,.18))",
              border:"1px solid rgba(167,139,250,.2)",
              borderRadius:Math.round(o.size*.18),
              transform:"rotate(45deg)",
              animation:`${o.anim} ${o.duration} ease-in-out ${o.delay} infinite`,
              backdropFilter:"blur(6px)",
              opacity:o.opacity,
            }}/>
          ))}

          {/* ── Thin ring ────────────────────────────────────── */}
          <div style={{
            position:"absolute", bottom:"18%", right:"6%",
            width:120, height:120, borderRadius:"50%",
            border:"1px solid rgba(124,58,237,.12)",
            animation:"bf-spin-slow 20s linear infinite",
          }}/>
          <div style={{
            position:"absolute", bottom:"18%", right:"6%",
            width:90, height:90, marginTop:15, marginLeft:15,
            borderRadius:"50%",
            border:"1px dashed rgba(167,139,250,.1)",
            animation:"bf-spin-slow 14s linear infinite reverse",
          }}/>
        </div>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">

          {/* Brand — icon + nome compacto */}
          <div className="bf-brand flex items-center gap-4">
            {/* Icon box 3D */}
            <div style={{
              position:"relative",
              width:60, height:60, borderRadius:18, flexShrink:0,
              background:"linear-gradient(145deg,#8b5cf6 0%,#6d28d9 55%,#4338ca 100%)",
              boxShadow:
                "0 2px 0 rgba(255,255,255,.14) inset," +
                "0 -1px 0 rgba(0,0,0,.25) inset," +
                "0 16px 40px rgba(109,40,217,.7)," +
                "0 6px 16px rgba(0,0,0,.45)",
              display:"flex", alignItems:"center", justifyContent:"center",
              transform:"perspective(200px) rotateX(5deg) rotateY(-3deg)",
            }}>
              {/* Glass highlight */}
              <div style={{
                position:"absolute", top:0, left:0, right:0, height:"44%",
                borderRadius:"18px 18px 60% 60%",
                background:"linear-gradient(180deg,rgba(255,255,255,.18) 0%,transparent 100%)",
              }}/>
              <BellefyIcon size={26} className="text-white" />
            </div>

            {/* Name + subtitle */}
            <div className="flex flex-col gap-1">
              <span className="bf-wordmark">Bellefy</span>
              <span style={{
                fontFamily:"'Outfit',sans-serif",
                fontSize:10, fontWeight:600,
                letterSpacing:"0.22em", textTransform:"uppercase",
                color:"rgba(167,139,250,.45)",
              }}>
                Gestão de Salões
              </span>
            </div>
          </div>

          {/* Card */}
          <div
            className="bf-card w-full rounded-3xl overflow-hidden"
            style={{
              background:"linear-gradient(180deg,rgba(255,255,255,.055) 0%,rgba(255,255,255,.03) 100%)",
              border:"1px solid rgba(255,255,255,.08)",
              backdropFilter:"blur(40px)",
              boxShadow:"0 32px 80px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.08) inset",
              transform: ready ? "perspective(1200px) rotateX(0deg)" : "perspective(1200px) rotateX(3deg)",
              transition:"transform .9s cubic-bezier(.22,1,.36,1)",
            }}
          >
            {/* Tabs */}
            <div className="flex p-1.5 gap-1.5" style={{
              background:"rgba(0,0,0,.38)",
              borderBottom:"1px solid rgba(255,255,255,.05)",
            }}>
              <TabBtn active={tab==="cliente"} onClick={()=>setTab("cliente")} amber>
                <CalendarDays className="w-3.5 h-3.5"/>
                Sou cliente
              </TabBtn>
              <TabBtn active={tab==="salao"} onClick={()=>setTab("salao")}>
                <Scissors className="w-3.5 h-3.5"/>
                Salão / Equipe
              </TabBtn>
            </div>

            {/* Body */}
            <div className="p-6">
              {tab==="salao" ? (
                <>
                  <div className="mb-5">
                    <h2 className="text-white font-black text-lg leading-tight">Bem-vindo de volta!</h2>
                    <p className="text-zinc-500 text-sm mt-0.5">Acesse o painel do seu salão.</p>
                  </div>
                  <LoginForm dark/>
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
                  <LoginForm dark callbackUrl="/agendar"/>
                  <div className="flex items-center gap-3 my-5">
                    <div className="flex-1 h-px" style={{background:"rgba(255,255,255,.06)"}}/>
                    <span className="text-[11px] text-zinc-600 font-semibold">ou</span>
                    <div className="flex-1 h-px" style={{background:"rgba(255,255,255,.06)"}}/>
                  </div>
                  <Link
                    href="/agendar"
                    className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-[.98]"
                    style={{
                      background:"linear-gradient(135deg,rgba(217,119,6,.15),rgba(180,83,9,.12))",
                      border:"1px solid rgba(217,119,6,.22)",
                    }}
                  >
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{background:"linear-gradient(135deg,#d97706,#b45309)"}}>
                      <CalendarDays className="w-4 h-4 text-white"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-amber-300">Agendar sem conta</p>
                      <p className="text-xs text-amber-800 mt-0.5">Escolha um salão e reserve agora</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-700/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0"/>
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Footer */}
          <p className="bf-footer" style={{color:"rgba(113,113,122,.5)", fontSize:11, textAlign:"center"}}>
            <span style={{color:"rgba(167,139,250,.45)", fontFamily:"'Syne',sans-serif", fontWeight:700}}>Bellefy</span>
            {" · "}Gestão de Salões
          </p>
        </div>
      </div>
    </>
  );
}

/* ─── TabBtn ────────────────────────────────────────────────────────────────── */
function TabBtn({ children, active, onClick, amber }: {
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
            ? { background:"linear-gradient(135deg,rgba(217,119,6,.28),rgba(180,83,9,.22))", color:"#fcd34d", border:"1px solid rgba(217,119,6,.3)", boxShadow:"0 2px 12px rgba(217,119,6,.15)" }
            : { background:"linear-gradient(135deg,rgba(124,58,237,.3),rgba(79,70,229,.25))", color:"#c4b5fd", border:"1px solid rgba(124,58,237,.35)", boxShadow:"0 2px 12px rgba(124,58,237,.2)" }
          : { color:"rgba(113,113,122,.6)", border:"1px solid transparent" }
      }
    >
      {children}
    </button>
  );
}
