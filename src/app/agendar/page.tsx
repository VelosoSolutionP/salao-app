import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalonPicker } from "@/components/agendar/SalonPicker";
import { ClienteNav } from "@/components/agendar/ClienteNav";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage() {
  const session = await auth();
  if (!session?.user) redirect("/agendar/entrar");

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

  const firstName = session.user.name?.split(" ")[0] ?? "você";

  // Check for pending fines on this client
  let totalMultaPendente = 0;
  if (session.user.role === "CLIENT") {
    const cliente = await prisma.cliente.findUnique({
      where: { userId: session.user.id },
    });
    if (cliente) {
      const multas = await prisma.agendamento.findMany({
        where: {
          clienteId: cliente.id,
          multaAplicada: true,
          multaPaga: false,
          status: "NAO_COMPARECEU",
        },
        select: { multaValor: true },
      });
      totalMultaPendente = multas.reduce(
        (acc, m) => acc + (m.multaValor ? Number(m.multaValor) : 0),
        0
      );
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-10 pb-32">
        <ClienteNav name={firstName} />

        <SalonPicker salons={serialized} totalMultaPendente={totalMultaPendente} />
      </div>
    </div>
  );
}
