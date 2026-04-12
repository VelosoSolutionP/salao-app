import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const updateSchema = z.object({
  nome: z.string().optional(),
  descricao: z.string().optional(),
  desconto: z.number().positive().optional(),
  ativa: z.boolean().optional(),
  validaDe: z.string().datetime().optional().nullable(),
  validaAte: z.string().datetime().optional().nullable(),
  usosMax: z.number().int().positive().optional().nullable(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.campanha.updateMany({
    where: { id, salonId: salonId! },
    data: {
      ...parsed.data,
      validaDe: parsed.data.validaDe ? new Date(parsed.data.validaDe) : undefined,
      validaAte: parsed.data.validaAte ? new Date(parsed.data.validaAte) : undefined,
    },
  });

  return NextResponse.json({ message: "Campanha atualizada" });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  await prisma.campanha.updateMany({
    where: { id, salonId: salonId! },
    data: { ativa: false },
  });

  return NextResponse.json({ message: "Campanha desativada" });
}
