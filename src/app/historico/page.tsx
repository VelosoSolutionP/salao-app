import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { HistoricoView, type AgendamentoItem } from "@/components/historico/HistoricoView";
import { ClienteNav } from "@/components/agendar/ClienteNav";

export const metadata: Metadata = { title: "Meus Agendamentos" };

export default async function HistoricoPage() {
  const session = await auth();
  if (!session?.user) redirect("/agendar/entrar");

  // Only CLIENTs use this page; staff goes to /dashboard/agenda
  if (session.user.role !== "CLIENT") redirect("/dashboard");

  const cliente = await prisma.cliente.findUnique({
    where: { userId: session.user.id },
  });

  if (!cliente) redirect("/agendar");

  const agendamentos = await prisma.agendamento.findMany({
    where: { clienteId: cliente.id },
    orderBy: { inicio: "desc" },
    include: {
      colaborador: { include: { user: { select: { name: true, image: true } } } },
      servicos: { include: { servico: { select: { nome: true, preco: true } } } },
      salon: {
        select: {
          name: true,
          cancelamentoHorasMinimo: true,
          multaValor: true,
          multaTipo: true,
        },
      },
    },
  });

  // Serialize for client component
  const serialized: AgendamentoItem[] = agendamentos.map((a) => ({
    id: a.id,
    inicio: a.inicio.toISOString(),
    fim: a.fim.toISOString(),
    status: a.status,
    totalPrice: Number(a.totalPrice),
    multaAplicada: a.multaAplicada,
    multaValor: a.multaValor ? Number(a.multaValor) : null,
    multaPaga: a.multaPaga,
    colaborador: {
      user: {
        name: a.colaborador.user.name,
        image: a.colaborador.user.image,
      },
    },
    servicos: a.servicos.map((sv) => ({
      servico: { nome: sv.servico.nome, preco: Number(sv.servico.preco) },
      preco: Number(sv.preco),
    })),
    salon: {
      name: a.salon.name,
      cancelamentoHorasMinimo: a.salon.cancelamentoHorasMinimo,
      multaValor: a.salon.multaValor ? Number(a.salon.multaValor) : null,
      multaTipo: a.salon.multaTipo,
    },
  }));

  const firstName = session.user.name?.split(" ")[0] ?? "você";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-700 via-violet-600 to-purple-700">
      {/* Decorative background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-2xl" />
      </div>

      <div className="relative max-w-md mx-auto px-4 pt-10 pb-32">
        <ClienteNav name={firstName} />

        <div className="mb-6">
          <h1 className="text-2xl font-black text-white tracking-tight">
            Meus agendamentos
          </h1>
          <p className="text-violet-200 text-sm mt-1">Histórico e próximos</p>
        </div>

        <HistoricoView agendamentos={serialized} />
      </div>
    </div>
  );
}
