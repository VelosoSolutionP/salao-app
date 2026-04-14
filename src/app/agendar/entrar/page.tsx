import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ClienteAuthForm } from "@/components/agendar/ClienteAuthForm";
import { ToqeIcon } from "@/components/brand/BrandLogo";

export const metadata: Metadata = { title: "Entrar para Agendar — TOQE" };

export default async function AgendarEntrarPage() {
  const session = await auth();

  // Já autenticado → vai direto para agendar
  if (session?.user) redirect("/agendar");

  // Pega nome do salão para exibir
  const salon = await prisma.salon.findFirst({
    where: { active: true },
    select: { name: true },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700 flex flex-col items-center justify-center px-4 py-12">

      {/* Background decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 -left-20 w-80 h-80 bg-purple-500/20 rounded-full blur-2xl" />
      </div>

      <div className="relative w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          {/* Ícone do salão */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-3xl mb-4 ring-1 ring-white/20 shadow-2xl">
            <span className="text-3xl">✂️</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            {salon?.name ?? "Agendar"}
          </h1>
          <p className="text-violet-200 text-sm mt-1">
            Entre ou crie sua conta para agendar
          </p>
        </div>

        {/* Form card */}
        <div
          className="rounded-3xl p-6 backdrop-blur-sm"
          style={{
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <ClienteAuthForm />
        </div>

        {/* Rodapé */}
        <div className="mt-6 flex items-center justify-center gap-2">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            <ToqeIcon size={12} className="text-white" />
          </div>
          <p className="text-white/30 text-xs font-semibold tracking-wide">
            TOQE · Gestão de Salões
          </p>
        </div>

      </div>
    </div>
  );
}
