import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/auth/LoginForm";
import { BrandPanel } from "@/components/brand/BrandPanel";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { CalendarDays, ChevronRight } from "lucide-react";

export const metadata: Metadata = { title: "Entrar — Hera" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">

      {/* ── LEFT: Splash panel ─────────────────────────── */}
      <BrandPanel mode="login" />

      {/* ── RIGHT: Form panel ──────────────────────────── */}
      <div className="flex-1 flex flex-col justify-center bg-white px-6 py-12 lg:px-16">

        {/* Mobile logo */}
        <div className="lg:hidden mb-10">
          <BrandLogo size="sm" theme="light" />
        </div>

        <div className="w-full max-w-sm mx-auto">

          {/* ── Login (staff/owner) ── */}
          <div className="mb-8">
            <p className="text-xs font-black uppercase tracking-widest text-violet-500 mb-2">
              Hera
            </p>
            <h2 className="text-[2rem] font-black text-gray-900 tracking-tight leading-tight">
              Bem-vindo de volta!
            </h2>
            <p className="text-gray-400 mt-2 text-sm leading-relaxed">
              Acesse o painel de gestão do seu salão.
            </p>
          </div>

          <LoginForm />

          <p className="text-center text-sm text-gray-400 mt-5">
            Proprietário sem conta?{" "}
            <Link href="/registro" className="text-violet-600 hover:text-violet-700 font-bold transition-colors">
              Cadastrar salão
            </Link>
          </p>

          {/* ── Divisor ── */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-300 font-semibold">ou</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* ── CTA para clientes ── */}
          <Link
            href="/agendar/entrar"
            className="group flex items-center gap-4 w-full px-5 py-4 rounded-2xl border-2 border-violet-100 hover:border-violet-300 hover:bg-violet-50 transition-all"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-200">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-black text-gray-900 text-sm">Quero agendar um serviço</p>
              <p className="text-gray-400 text-xs mt-0.5">Crie sua conta de cliente gratuitamente</p>
            </div>
            <ChevronRight className="w-4 h-4 text-violet-400 group-hover:translate-x-0.5 transition-transform flex-shrink-0" />
          </Link>

          <p className="text-center text-[11px] text-gray-300 mt-8">
            © {new Date().getFullYear()} Hera · Todos os direitos reservados
          </p>
        </div>
      </div>

    </div>
  );
}
