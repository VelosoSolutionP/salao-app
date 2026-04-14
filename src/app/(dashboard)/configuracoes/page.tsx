import type { Metadata } from "next";
import { ConfiguracoesView } from "@/components/configuracoes/ConfiguracoesView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = { title: "Configurações" };

export default async function ConfiguracoesPage() {
  const session = await auth();
  const salon = await prisma.salon.findFirst({
    where: { ownerId: session!.user.id },
    include: { horarios: { orderBy: { diaSemana: "asc" } } },
  });

  const serializedSalon = salon
    ? {
        ...salon,
        multaValor: salon.multaValor ? Number(salon.multaValor) : null,
        multaTipo: salon.multaTipo ?? null,
        codigoConvite: salon.codigoConvite ?? null,
        cancelamentoHorasMinimo: salon.cancelamentoHorasMinimo,
      }
    : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm">Dados do salão, horários e pagamentos</p>
      </div>
      <ConfiguracoesView salon={serializedSalon} />
    </div>
  );
}
