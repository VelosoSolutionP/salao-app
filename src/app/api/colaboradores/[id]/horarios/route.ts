import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";

const horarioSchema = z.array(
  z.object({
    diaSemana: z.number().min(0).max(6),
    inicio: z.string().regex(/^\d{2}:\d{2}$/),
    fim: z.string().regex(/^\d{2}:\d{2}$/),
    ativo: z.boolean().default(true),
  })
);

const bloqueioSchema = z.object({
  inicio: z.string().datetime(),
  fim: z.string().datetime(),
  motivo: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;

  const horarios = await prisma.horarioColaborador.findMany({
    where: { colaboradorId: id },
    orderBy: { diaSemana: "asc" },
  });

  return NextResponse.json(horarios);
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = horarioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.horarioColaborador.deleteMany({ where: { colaboradorId: id } });
    await tx.horarioColaborador.createMany({
      data: parsed.data.map((h) => ({ ...h, colaboradorId: id })),
    });
  });

  await invalidateCache(CK.COLABORADORES(salonId!));

  return NextResponse.json({ message: "Horários atualizados" });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { error } = await requireRole(["OWNER"]);
  if (error) return error;

  const body = await req.json();
  const parsed = bloqueioSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const bloqueio = await prisma.bloqueioAgenda.create({
    data: { colaboradorId: id, ...parsed.data },
  });

  return NextResponse.json(bloqueio, { status: 201 });
}
