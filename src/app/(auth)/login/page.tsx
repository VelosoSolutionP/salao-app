"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import {
  CalendarDays, ChevronRight,
  Users, BarChart3, Package, Sparkles,
} from "lucide-react";

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

  /* ── Splash keyframes ───────────────────────────────────────────────────── */
  @keyframes sp-icon {
    from { opacity:0; transform:translateY(28px) scale(.88); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }
  @keyframes sp-word {
    from { opacity:0; transform:translateY(20px); }
    to   { opacity:1; transform:translateY(0); }
  }
  @keyframes sp-chip {
    from { opacity:0; transform:translateY(18px) scale(.94); }
    to   { opacity:1; transform:translateY(0)    scale(1); }
  }
  @keyframes sp-glow-pulse {
    0%,100% { opacity:.5; transform:scale(1); }
    50%      { opacity:1;  transform:scale(1.12); }
  }
`;

/* ─── Modules shown in splash ───────────────────────────────────────────────── */
const MODULES = [
  { Icon: CalendarDays, label: "Agenda",     color: "#a78bfa", glow: "rgba(139,92,246,.35)"  },
  { Icon: Users,        label: "Equipe",     color: "#60a5fa", glow: "rgba(96,165,250,.35)"  },
  { Icon: BarChart3,    label: "Financeiro", color: "#34d399", glow: "rgba(52,211,153,.35)"  },
  { Icon: Package,      label: "Estoque",    color: "#fb923c", glow: "rgba(251,146,60,.35)"  },
  { Icon: Sparkles,     label: "Marketing",  color: "#f472b6", glow: "rgba(244,114,182,.35)" },
];

/* ─── Page ───────────────────────────────────────────────────────────────────── */
export default function LoginPage() {
  const [ready, setReady] = useState(false);
  const [splashPhase, setSplashPhase] = useState<"in" | "float" | "out" | "done">("in");

  useEffect(() => {
    setReady(true);
    const t1 = setTimeout(() => setSplashPhase("float"), 2200);
    const t2 = setTimeout(() => setSplashPhase("out"),   2800);
    const t3 = setTimeout(() => setSplashPhase("done"),  3500);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <>
      <style>{STYLES}</style>

      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden px-5 py-14"
        style={{ background: "linear-gradient(150deg,#07051c 0%,#100a2a 55%,#07051a 100%)" }}
      >
        {/* ── Ambient depth ─────────────────────────────────────────────────── */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div style={{
            position:"absolute", top:"-28%", left:"-18%",
            width:"72vw", height:"72vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(109,40,217,.28) 0%,transparent 60%)",
            filter:"blur(1px)",
          }}/>
          <div style={{
            position:"absolute", bottom:"-22%", right:"-12%",
            width:"60vw", height:"60vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(79,70,229,.2) 0%,transparent 60%)",
            filter:"blur(1px)",
          }}/>
          <div style={{
            position:"absolute", top:"30%", right:"-5%",
            width:"30vw", height:"30vw", borderRadius:"50%",
            background:"radial-gradient(circle,rgba(167,139,250,.1) 0%,transparent 65%)",
          }}/>

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

        {/* ── Login content ─────────────────────────────────────────────────── */}
        <div
          className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8"
          style={{
            opacity: splashPhase === "done" ? 1 : 0,
            transition: "opacity .55s ease .1s",
          }}
        >
          <div className="bf-brand flex items-center gap-4">
            <div style={{
              width:60, height:60, borderRadius:18, flexShrink:0, overflow:"hidden",
              boxShadow:
                "0 16px 40px rgba(196,163,90,.4)," +
                "0 6px 16px rgba(0,0,0,.45)",
            }}>
              <div style={{
                width:"100%", height:"100%",
                backgroundColor:"#000",
                backgroundImage:"url('/logo.jpeg')",
                backgroundRepeat:"no-repeat",
                backgroundPosition:"center top",
                backgroundSize:"94px auto",
              }} />
            </div>

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
            <div className="p-6">
              <div className="mb-5">
                <h2 className="text-white font-black text-lg leading-tight">Bem-vindo de volta!</h2>
                <p className="text-zinc-500 text-sm mt-0.5">Entre com sua conta para continuar.</p>
              </div>
              <LoginForm dark />
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
              <Link
                href="/registro"
                className="group flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl transition-all hover:opacity-90 active:scale-[.98] mt-3"
                style={{
                  background:"linear-gradient(135deg,rgba(124,58,237,.12),rgba(79,70,229,.1))",
                  border:"1px solid rgba(124,58,237,.2)",
                }}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{background:"linear-gradient(135deg,#7c3aed,#6d28d9)"}}>
                  <Users className="w-4 h-4 text-white"/>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black text-violet-300">Criar conta</p>
                  <p className="text-xs text-violet-900 mt-0.5">Cadastre-se para agendar serviços</p>
                </div>
                <ChevronRight className="w-4 h-4 text-violet-700/60 group-hover:translate-x-0.5 transition-transform flex-shrink-0"/>
              </Link>
            </div>
          </div>

          <p className="bf-footer" style={{color:"rgba(113,113,122,.5)", fontSize:11, textAlign:"center"}}>
            <span style={{color:"rgba(167,139,250,.45)", fontFamily:"'Outfit',sans-serif", fontWeight:700}}>Bellefy</span>
            {" · "}Gestão de Salões
          </p>
        </div>

        {/* ── Splash overlay ─────────────────────────────────────────────────── */}
        {splashPhase !== "done" && (
          <SplashOverlay phase={splashPhase} />
        )}
      </div>
    </>
  );
}

/* ─── Splash overlay ────────────────────────────────────────────────────────── */
function SplashOverlay({ phase }: { phase: "in" | "float" | "out" }) {
  return (
    <div
      style={{
        position:"fixed", inset:0, zIndex:30,
        display:"flex", flexDirection:"column",
        alignItems:"center", justifyContent:"center",
        background:"linear-gradient(150deg,#07051c 0%,#100a2a 55%,#07051a 100%)",
        opacity: phase === "out" ? 0 : 1,
        transition: phase === "out" ? "opacity .65s cubic-bezier(.4,0,1,1)" : "none",
        pointerEvents: phase === "out" ? "none" : "all",
      }}
    >
      <div style={{
        position:"absolute", top:"-28%", left:"-18%",
        width:"72vw", height:"72vw", borderRadius:"50%",
        background:"radial-gradient(circle,rgba(109,40,217,.28) 0%,transparent 60%)",
        filter:"blur(1px)", pointerEvents:"none",
      }}/>
      <div style={{
        position:"absolute", bottom:"-22%", right:"-12%",
        width:"60vw", height:"60vw", borderRadius:"50%",
        background:"radial-gradient(circle,rgba(79,70,229,.2) 0%,transparent 60%)",
        filter:"blur(1px)", pointerEvents:"none",
      }}/>

      <div style={{
        display:"flex", flexDirection:"column", alignItems:"center", gap:0,
        transform: phase === "float" ? "translateY(-36px)" : "translateY(0)",
        transition: phase === "float" ? "transform .9s cubic-bezier(.22,1,.36,1)" : "none",
      }}>
        <div style={{
          width:72, height:72, borderRadius:22, flexShrink:0, overflow:"hidden",
          boxShadow:
            "0 20px 60px rgba(196,163,90,.5)," +
            "0 8px 20px rgba(0,0,0,.5)",
          animation:"sp-icon .7s cubic-bezier(.22,1,.36,1) both",
          marginBottom:20,
        }}>
          <div style={{
            width:"100%", height:"100%",
            backgroundColor:"#000",
            backgroundImage:"url('/logo.jpeg')",
            backgroundRepeat:"no-repeat",
            backgroundPosition:"center top",
            backgroundSize:"113px auto",
          }} />
        </div>

        <div style={{
          fontFamily:"'Outfit',sans-serif",
          fontWeight:800,
          fontSize:"2.6rem",
          lineHeight:1,
          letterSpacing:"-.025em",
          color:"#fff",
          textShadow:
            "0 1px 0 rgba(167,139,250,.9)," +
            "0 2px 0 rgba(124,58,237,.75)," +
            "0 4px 0 rgba(109,40,217,.55)," +
            "0 7px 14px rgba(79,46,120,.6)," +
            "0 14px 32px rgba(0,0,0,.4)",
          animation:"sp-word .65s cubic-bezier(.22,1,.36,1) .18s both",
          marginBottom:8,
        }}>
          Bellefy
        </div>

        <div style={{
          fontFamily:"'Outfit',sans-serif",
          fontSize:11, fontWeight:600,
          letterSpacing:"0.24em", textTransform:"uppercase",
          color:"rgba(167,139,250,.45)",
          animation:"sp-word .55s cubic-bezier(.22,1,.36,1) .42s both",
          marginBottom:40,
        }}>
          Gestão de Salões
        </div>

        <div style={{
          display:"flex", flexWrap:"wrap", justifyContent:"center",
          gap:10, maxWidth:300,
          opacity: phase === "float" ? 0.4 : 1,
          transition: phase === "float" ? "opacity .7s ease" : "none",
        }}>
          {MODULES.map(({ Icon, label, color, glow }, i) => (
            <div
              key={label}
              style={{
                display:"flex", alignItems:"center", gap:7,
                padding:"7px 14px",
                borderRadius:100,
                background:`linear-gradient(135deg,rgba(255,255,255,.05),rgba(255,255,255,.02))`,
                border:`1px solid ${glow.replace(".35","0.22")}`,
                backdropFilter:"blur(12px)",
                boxShadow:`0 2px 16px ${glow}, 0 1px 0 rgba(255,255,255,.05) inset`,
                animation:`sp-chip .5s cubic-bezier(.22,1,.36,1) ${0.65 + i * 0.12}s both`,
              }}
            >
              <Icon size={13} style={{ color, flexShrink:0 }} />
              <span style={{
                fontFamily:"'Outfit',sans-serif",
                fontSize:12, fontWeight:700,
                color:"rgba(255,255,255,.75)",
                letterSpacing:".01em",
              }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
