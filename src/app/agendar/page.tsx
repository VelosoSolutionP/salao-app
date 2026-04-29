import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SalonPicker } from "@/components/agendar/SalonPicker";
import { ClienteNav } from "@/components/agendar/ClienteNav";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Agendar" };

export default async function AgendarPage() {
  const session = await auth();
  // Não bloqueia visitantes — eles podem ver os salões e agendar
  // (o fluxo de auth acontece dentro do AgendarView ao confirmar)

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
      comissaoSalaoProduto: Number(c.comissaoSalaoProduto),
      comissaoProprioProduto: Number(c.comissaoProprioProduto),
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      horarios: c.horarios,
    })),
    horarios: s.horarios, // HorarioSalon has no timestamps
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const firstName = session?.user?.name?.split(" ")[0] ?? null;

  // Check for pending fines on this client (only if logged in)
  let totalMultaPendente = 0;
  if (session?.user?.role === "CLIENT") {
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
    <div className="min-h-screen relative overflow-hidden" style={{
      background: "linear-gradient(135deg, #1e1b4b 0%, #4c1d95 30%, #6d28d9 60%, #be185d 100%)"
    }}>
      {/* Decorative blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #f472b6, transparent)" }} />
        <div className="absolute top-1/2 -left-32 w-80 h-80 rounded-full opacity-20 blur-3xl" style={{ background: "radial-gradient(circle, #818cf8, transparent)" }} />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-15 blur-3xl" style={{ background: "radial-gradient(circle, #34d399, transparent)" }} />
        {/* Mesh overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "32px 32px"
        }} />
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-10 pb-32">
        <ClienteNav name={firstName} isGuest={!session?.user} />
        <SalonPicker salons={serialized} totalMultaPendente={totalMultaPendente} />
      </div>
    </div>
  );
}
