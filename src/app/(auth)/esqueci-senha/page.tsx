import type { Metadata } from "next";
import Link from "next/link";
import { EsqueciSenhaForm } from "@/components/auth/EsqueciSenhaForm";

export const metadata: Metadata = { title: "Esqueci minha senha — Veloso Solution" };

export default function EsqueciSenhaPage() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "linear-gradient(135deg,#0e0b1a 0%,#1a1040 50%,#0c0a18 100%)" }}
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at 50% 0%,rgba(124,58,237,.15) 0%,transparent 60%)" }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl shadow-black/30 overflow-hidden">
          {/* Top accent */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#7c3aed,#4f46e5,#7c3aed)" }} />

          <div className="p-8 sm:p-10">
            {/* Logo */}
            <div className="flex items-center gap-2.5 mb-8">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 4px 16px rgba(124,58,237,.4)" }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/>
                  <line x1="20" y1="4" x2="8.12" y2="15.88"/>
                  <line x1="14.47" y1="14.48" x2="20" y2="20"/>
                  <line x1="8.12" y1="8.12" x2="12" y2="12"/>
                </svg>
              </div>
              <Link href="/login">
                <span className="font-black text-gray-900 text-sm tracking-tight hover:text-violet-700 transition-colors">
                  Veloso Solution
                </span>
              </Link>
            </div>

            {/* Heading */}
            <div className="mb-7">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Esqueci minha senha</h1>
              <p className="text-gray-400 text-sm mt-1.5 leading-relaxed">
                Informe seu email e enviaremos um link para criar uma nova senha.
              </p>
            </div>

            <EsqueciSenhaForm />
          </div>
        </div>

        <p className="text-center text-[11px] text-zinc-600 mt-6">
          © {new Date().getFullYear()} Veloso Solution · Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
