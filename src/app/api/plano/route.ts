export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPlano } from "@/lib/planos";

export async function GET() {
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;

  const salon = await prisma.salon.findFirst({
    where: session!.user.salonId
      ? { id: session!.user.salonId }
      : { ownerId: session!.user.id },
    select: {
      id: true,
      contratos: {
        where: { ativo: true },
        select: { plano: true, valorMensal: true, diaVencimento: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { colaboradores: { where: { active: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  if (!salon) return NextResponse.json({ plano: getPlano(null), usage: { funcionarios: 0 } });

  const planoTipo = salon.contratos[0]?.plano ?? null;
  const config = getPlano(planoTipo);

  return NextResponse.json({
    plano: config,
    contrato: salon.contratos[0] ?? null,
    usage: {
      funcionarios: salon._count.colaboradores,
    },
  });
}
