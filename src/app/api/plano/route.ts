export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPlano, emPeriodoTrial, deveBloquear } from "@/lib/planos";

export async function GET() {
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;

  const timeout = new Promise<null>((res) => setTimeout(() => res(null), 4000));

  const query = prisma.salon.findFirst({
    where: session!.user.salonId
      ? { id: session!.user.salonId }
      : { ownerId: session!.user.id },
    select: {
      id: true,
      createdAt: true,
      contratos: {
        where: { ativo: true },
        select: {
          plano: true,
          valorMensal: true,
          diaVencimento: true,
          pagamentos: {
            orderBy: { vencimento: "desc" },
            take: 1,
            select: { pago: true, vencimento: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: { select: { colaboradores: { where: { active: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  const salon = await Promise.race([query, timeout]);

  // DB fria ou sem salão — retorna fallback liberado
  if (!salon) return NextResponse.json({ plano: getPlano(null), usage: { funcionarios: 0 }, bloqueado: false, trial: true, diasTrial: 30 });

  const contrato = salon.contratos[0] ?? null;
  const planoTipo = contrato?.plano ?? null;
  const config = getPlano(planoTipo);

  const ultimoPagamento = contrato?.pagamentos?.[0] ?? null;
  const bloqueado = deveBloquear({
    contratoAtivo: !!contrato,
    ultimoVencimento: ultimoPagamento?.vencimento ?? null,
    pago: ultimoPagamento?.pago ?? false,
  });
  const trial = emPeriodoTrial(salon.createdAt);
  const diasTrial = Math.max(0, 30 - Math.floor((Date.now() - salon.createdAt.getTime()) / (1000 * 60 * 60 * 24)));

  return NextResponse.json({
    plano: config,
    contrato: contrato ? { plano: contrato.plano, valorMensal: contrato.valorMensal, diaVencimento: contrato.diaVencimento } : null,
    usage: { funcionarios: salon._count.colaboradores },
    bloqueado,
    trial,
    diasTrial,
  });
}
