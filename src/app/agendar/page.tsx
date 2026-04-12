import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AgendarView } from "@/components/agendar/AgendarView";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const salons = await prisma.salon.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" }, // mais recente primeiro
    include: {
      horarios: true,
      servicos: { where: { ativo: true }, orderBy: { nome: "asc" } },
      colaboradores: {
        where: { active: true },
        include: {
          user: { select: { name: true, image: true } },
          horarios: true,
          servicosOffer: { select: { servicoId: true } },
        },
      },
    },
  });

  // Serialize Decimal and Date objects for Client Components
  const serialized = salons.map((s) => ({
    ...s,
    pixKey: s.pixKey ?? null,
    servicos: s.servicos.map((sv) => ({
      ...sv,
      preco: Number(sv.preco),
      createdAt: sv.createdAt.toISOString(),
      updatedAt: sv.updatedAt.toISOString(),
    })),
    colaboradores: s.colaboradores.map((c) => ({
      ...c,
      comissao: Number(c.comissao),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      horarios: c.horarios, // HorarioColaborador has no timestamps
    })),
    horarios: s.horarios, // HorarioSalon has no timestamps
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const salon = serialized[0];
  const firstName = session.user.name?.split(" ")[0] ?? "você";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-10 pb-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 backdrop-blur-sm rounded-3xl mb-4 ring-1 ring-white/20 shadow-2xl">
            <span className="text-3xl">✂️</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {salon?.name ?? "Salão"}
          </h1>
          <p className="text-violet-200 mt-1 text-sm">
            Olá, <span className="font-semibold text-white">{firstName}</span>! Vamos agendar?
          </p>
        </div>

        <AgendarView salons={serialized} />
      </div>
    </div>
  );
}
