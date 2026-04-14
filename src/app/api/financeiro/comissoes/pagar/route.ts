export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const schema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { ids } = parsed.data;

  // Fetch pending commissions to pay
  const comissoes = await prisma.comissaoColaborador.findMany({
    where: { id: { in: ids }, salonId, pago: false },
    include: {
      colaborador: { include: { user: { select: { name: true } } } },
    },
  });

  if (comissoes.length === 0) {
    return NextResponse.json({ error: "Nenhuma comissão pendente encontrada" }, { status: 400 });
  }

  const now = new Date();
  const pagoEm = now;

  // Group by colaborador to create one DESPESA per professional
  const byColab = new Map<string, { nome: string; total: number; comissaoIds: string[] }>();
  for (const c of comissoes) {
    const nome = c.colaborador.user.name;
    const existing = byColab.get(c.colaboradorId);
    if (existing) {
      existing.total += Number(c.valor);
      existing.comissaoIds.push(c.id);
    } else {
      byColab.set(c.colaboradorId, { nome, total: Number(c.valor), comissaoIds: [c.id] });
    }
  }

  // Create one DESPESA per collaborador and link to commissions
  let totalDespesas = 0;
  for (const [, { nome, total, comissaoIds }] of byColab) {
    const despesa = await prisma.transacao.create({
      data: {
        salonId,
        tipo: "DESPESA",
        descricao: `Comissão — ${nome}`,
        valor: total,
        categoria: "Comissões",
        dataTransacao: pagoEm,
      },
    });

    // Mark all these commissions as paid and link to the despesa
    await prisma.comissaoColaborador.updateMany({
      where: { id: { in: comissaoIds }, salonId },
      data: { pago: true, pagoEm, despesaId: despesa.id },
    });

    totalDespesas += total;
  }

  return NextResponse.json({
    ok: true,
    pagos: comissoes.length,
    totalDespesas,
    profissionais: byColab.size,
  });
}
