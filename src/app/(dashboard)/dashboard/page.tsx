import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { HomeView } from "@/components/home/HomeView";
import { ArrowRight } from "lucide-react";
import { startOfDay, endOfDay } from "date-fns";

export const metadata: Metadata = { title: "Início — Hera" };

function buildGreeting(name: string): string {
  const h = new Date().getHours();
  if (h < 12) return `Bom dia, ${name}!`;
  if (h < 18) return `Boa tarde, ${name}!`;
  return `Boa noite, ${name}!`;
}

export default async function DashboardPage() {
  const session = await auth();
  const salonId = session?.user.salonId ?? null;
  const userName = session?.user.name ?? "gestor";
  const firstName = userName.split(" ")[0];

  if (!salonId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 bg-violet-50 rounded-3xl flex items-center justify-center mb-4">
          <span className="text-4xl">✂️</span>
        </div>
        <h2 className="text-xl font-black text-gray-900">Salão não configurado</h2>
        <p className="text-gray-400 text-sm mt-2 max-w-xs">
          Configure seu salão para começar a usar o sistema.
        </p>
        <Link
          href="/configuracoes"
          className="mt-6 inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-violet-700 transition-colors"
        >
          Configurar agora <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);

  const [agendamentosHoje, pendentesCount, configData] = await Promise.all([
    prisma.agendamento.findMany({
      where: { salonId, inicio: { gte: todayStart, lte: todayEnd } },
      include: {
        cliente: { include: { user: { select: { name: true, phone: true } } } },
        colaborador: { include: { user: { select: { name: true, image: true } } } },
        servicos: { include: { servico: { select: { nome: true } } } },
      },
      orderBy: { inicio: "asc" },
    }),

    prisma.agendamento.count({ where: { salonId, status: "PENDENTE" } }),

    prisma.salon.findUnique({ where: { id: salonId }, select: { name: true } }),
  ]);

  return (
    <HomeView
      greeting={buildGreeting(firstName)}
      salonName={configData?.name ?? "Hera"}
      agendamentosHoje={agendamentosHoje}
      pendentesCount={pendentesCount}
    />
  );
}
