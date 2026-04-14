export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const updateSchema = z.object({
  nome: z.string().min(2).optional(),
  descricao: z.string().optional(),
  periodicidade: z.enum(["SEMANAL", "QUINZENAL", "MENSAL"]).optional(),
  qtdAtendimentos: z.number().int().min(1).max(30).optional(),
  valor: z.number().positive().optional(),
  servicoIds: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.planoFidelidade.findFirst({ where: { id, salonId } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const updated = await prisma.planoFidelidade.update({ where: { id }, data: parsed.data });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const existing = await prisma.planoFidelidade.findFirst({ where: { id, salonId } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.planoFidelidade.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
