"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Scissors, LogOut, LogIn } from "lucide-react";

export function ClienteNav({ name, isGuest }: { name: string | null; isGuest?: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-white/50 text-xs font-semibold">Olá 👋</p>
          <p className="text-white font-black text-base leading-tight truncate max-w-[180px]">
            {isGuest ? "Visitante" : (name ?? "você")}
          </p>
        </div>
        {isGuest ? (
          <Link
            href="/agendar/entrar"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
          >
            <LogIn className="w-4 h-4" />
            Entrar
          </Link>
        ) : (
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        )}
      </div>

      {/* ── Bottom tab navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
        <div className="max-w-md mx-auto px-4 pb-4">
          <div
            className="flex rounded-3xl overflow-hidden shadow-2xl shadow-black/30"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.15)" }}
          >
            <Link
              href="/agendar"
              className={`flex-1 flex flex-col items-center gap-1 py-3.5 transition-all ${
                pathname === "/agendar"
                  ? "text-white"
                  : "text-white/40 hover:text-white/70"
              }`}
            >
              <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${
                pathname === "/agendar" ? "bg-white/20" : ""
              }`}>
                <Scissors className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black tracking-wide">AGENDAR</span>
            </Link>

            {!isGuest && (
              <Link
                href="/historico"
                className={`flex-1 flex flex-col items-center gap-1 py-3.5 transition-all ${
                  pathname === "/historico"
                    ? "text-white"
                    : "text-white/40 hover:text-white/70"
                }`}
              >
                <div className={`w-8 h-8 rounded-2xl flex items-center justify-center transition-all ${
                  pathname === "/historico" ? "bg-white/20" : ""
                }`}>
                  <CalendarDays className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black tracking-wide">AGENDAMENTOS</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
