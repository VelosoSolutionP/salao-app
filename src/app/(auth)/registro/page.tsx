import type { Metadata } from "next";
import Link from "next/link";
import { RegistroForm } from "@/components/auth/RegistroForm";
import { BrandPanel } from "@/components/brand/BrandPanel";
import { BrandLogo } from "@/components/brand/BrandLogo";

export const metadata: Metadata = { title: "Criar Conta — Hera" };

export default function RegistroPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Splash panel ─────────────────────────── */}
      <BrandPanel mode="registro" />

      {/* ── RIGHT: Form panel ──────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 lg:px-16 overflow-y-auto">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <BrandLogo size="sm" theme="light" />
        </div>

        <div className="w-full max-w-sm mx-auto">
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">
              Hera
            </p>
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

          <p className="text-center text-[11px] text-gray-300 mt-8">
            © {new Date().getFullYear()} Hera · Todos os direitos reservados
          </p>
        </div>
      </div>

    </div>
  );
}
