export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";

const updateSchema = z.object({
  descricao: z.string().optional(),
  valor: z.number().positive().optional(),
  metodo: z
    .enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "TRANSFERENCIA"])
    .optional(),
  categoria: z.string().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.transacao.updateMany({
    where: { id, salonId: salonId! },
    data: parsed.data,
  });

  await invalidateCache(CK.RELATORIO(salonId!, "financeiro", "mes"));

  return NextResponse.json({ message: "Atualizado" });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  await prisma.transacao.deleteMany({
    where: { id, salonId: salonId!, agendamentoId: null }, // only manual entries
  });

  await invalidateCache(CK.RELATORIO(salonId!, "financeiro", "mes"));

  return NextResponse.json({ message: "Removido" });
}
