import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";

const updateSchema = z.object({
  bio: z.string().optional(),
  specialties: z.array(z.string()).optional(),
  comissao: z.number().min(0).max(1).optional(),
  active: z.boolean().optional(),
  servicoIds: z.array(z.string()).optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const collab = await prisma.colaborador.findFirst({
    where: { id, salonId: salonId! },
    include: {
      user: true,
      horarios: true,
      servicosOffer: { include: { servico: true } },
      bloqueios: { orderBy: { inicio: "asc" } },
    },
  });

  if (!collab) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  return NextResponse.json(collab);
}

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

  const { servicoIds, ...rest } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.colaborador.updateMany({
      where: { id, salonId: salonId! },
      data: rest,
    });

    if (servicoIds !== undefined) {
      await tx.colaboradorServico.deleteMany({ where: { colaboradorId: id } });
      if (servicoIds.length > 0) {
        await tx.colaboradorServico.createMany({
          data: servicoIds.map((servicoId) => ({ colaboradorId: id, servicoId })),
        });
      }
    }
  });

  await invalidateCache(CK.COLABORADORES(salonId!));

  return NextResponse.json({ message: "Atualizado" });
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

  await prisma.colaborador.updateMany({
    where: { id, salonId: salonId! },
    data: { active: false },
  });

  await invalidateCache(CK.COLABORADORES(salonId!));

  return NextResponse.json({ message: "Colaborador desativado" });
}
