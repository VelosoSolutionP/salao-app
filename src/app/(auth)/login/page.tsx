"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BellefyIcon } from "@/components/brand/BrandLogo";
import { CalendarDays, Scissors, ChevronRight } from "lucide-react";

/* ─── Keyframes & font injected once ───────────────────────────────────────── */
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');

  @keyframes bf-float {
    0%,100% { transform: translateY(0)   rotate(0deg)   scale(1); }
    33%      { transform: translateY(-18px) rotate(8deg)  scale(1.04); }
    66%      { transform: translateY(10px)  rotate(-5deg) scale(.97); }
  }
  @keyframes bf-float2 {
    0%,100% { transform: translateY(0)   rotate(45deg)  scale(1); }
    50%      { transform: translateY(-26px) rotate(55deg) scale(1.06); }
  }
  @keyframes bf-orbit {
    from { transform: rotate(0deg)   translateX(52px) rotate(0deg); }
    to   { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
  }
  @keyframes bf-orbit2 {
    from { transform: rotate(180deg) translateX(70px) rotate(-180deg); }
    to   { transform: rotate(540deg) translateX(70px) rotate(-540deg); }
  }
  @keyframes bf-pulse {
    0%,100% { opacity:.18; transform:scale(1); }
    50%     { opacity:.32; transform:scale(1.08); }
  }
  @keyframes bf-shimmer {
    0%   { background-position: -300% center; }
    100% { background-position:  300% center; }
  }
  @keyframes bf-in {
    from { opacity:0; transform:translateY(28px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes bf-in2 {
    from { opacity:0; transform:translateY(20px) scale(.97); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }
  @keyframes bf-spin-slow {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .bf-brand  { animation: bf-in  .7s cubic-bezier(.22,1,.36,1) both; }
  .bf-card   { animation: bf-in2 .7s cubic-bezier(.22,1,.36,1) .18s both; }
  .bf-footer { animation: bf-in  .5s ease .4s both; }

  .bf-wordmark {
    font-family: 'Syne', sans-serif;
    font-weight: 800;
    font-size: 3.4rem;
    line-height: 1;
    letter-spacing: -.04em;
    background: linear-gradient(105deg,#fff 0%,#ddd6fe 40%,#a78bfa 65%,#fff 100%);
    background-size: 300% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: bf-shimmer 6s linear infinite;
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

          {/* Brand */}
          <div className="bf-brand flex flex-col items-center gap-5 text-center">

            {/* Icon with orbital rings */}
            <div className="relative" style={{ width:96, height:96 }}>
              {/* slow-pulse ring 1 */}
              <div style={{
                position:"absolute", inset:-16, borderRadius:"50%",
                border:"1px solid rgba(124,58,237,.18)",
                animation:"bf-pulse 4s ease-in-out infinite",
              }}/>
              {/* slow-pulse ring 2 */}
              <div style={{
                position:"absolute", inset:-8, borderRadius:"50%",
                border:"1px solid rgba(124,58,237,.25)",
                animation:"bf-pulse 4s ease-in-out .6s infinite",
              }}/>

              {/* Orbiting dot 1 */}
              <div style={{
                position:"absolute", top:"50%", left:"50%",
                marginTop:-4, marginLeft:-4,
                width:8, height:8,
              }}>
                <div style={{
                  width:8, height:8, borderRadius:"50%",
                  background:"linear-gradient(135deg,#a78bfa,#818cf8)",
                  boxShadow:"0 0 8px rgba(167,139,250,.7)",
                  animation:"bf-orbit 5s linear infinite",
                }}/>
              </div>
              {/* Orbiting dot 2 */}
              <div style={{
                position:"absolute", top:"50%", left:"50%",
                marginTop:-3, marginLeft:-3,
                width:6, height:6,
              }}>
                <div style={{
                  width:6, height:6, borderRadius:"50%",
                  background:"rgba(196,181,253,.5)",
                  animation:"bf-orbit2 8s linear infinite",
                }}/>
              </div>

              {/* Icon box */}
              <div style={{
                position:"relative", width:96, height:96,
                borderRadius:28,
                background:"linear-gradient(140deg,#7c3aed 0%,#5b21b6 60%,#4338ca 100%)",
                boxShadow:"0 2px 0 rgba(255,255,255,.12) inset, 0 -2px 0 rgba(0,0,0,.3) inset, 0 24px 64px rgba(109,40,217,.75), 0 8px 24px rgba(0,0,0,.5)",
                display:"flex", alignItems:"center", justifyContent:"center",
                transform:"perspective(300px) rotateX(6deg) rotateY(-2deg)",
              }}>
                {/* Inner highlight */}
                <div style={{
                  position:"absolute", top:0, left:0, right:0, height:"45%",
                  borderRadius:"28px 28px 50% 50%",
                  background:"linear-gradient(180deg,rgba(255,255,255,.15) 0%,transparent 100%)",
                }}/>
                <BellefyIcon size={40} className="text-white" />
              </div>
            </div>

            {/* Wordmark */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="bf-wordmark">Bellefy</span>
              <span style={{
                fontFamily:"'Syne',sans-serif",
                fontSize:10, fontWeight:700,
                letterSpacing:"0.28em", textTransform:"uppercase",
                color:"rgba(167,139,250,.5)",
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
