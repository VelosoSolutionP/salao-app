export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  preco: z.number().positive().optional(),
  duracao: z.number().int().positive().optional(),
  categoria: z.string().optional(),
  imageUrl: z.string().url().optional().nullable(),
  ativo: z.boolean().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "BARBER", "CLIENT"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const servico = await prisma.servico.findFirst({
    where: { id, salonId: salonId! },
  });

  if (!servico) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(servico);
}

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

  const servico = await prisma.servico.updateMany({
    where: { id, salonId: salonId! },
    data: parsed.data,
  });

  if (servico.count === 0) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await invalidateCache(CK.SERVICOS(salonId!));

  return NextResponse.json({ message: "Atualizado com sucesso" });
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

  await prisma.servico.updateMany({
    where: { id, salonId: salonId! },
    data: { ativo: false },
  });

  await invalidateCache(CK.SERVICOS(salonId!));

  return NextResponse.json({ message: "Serviço removido" });
}
