import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const createSchema = z.object({
  nome: z.string().min(2),
  descricao: z.string().optional(),
  periodicidade: z.enum(["SEMANAL", "QUINZENAL", "MENSAL"]).default("MENSAL"),
  qtdAtendimentos: z.number().int().min(1).max(30).default(1),
  valor: z.number().positive(),
  servicoIds: z.array(z.string()).default([]),
});

export async function GET(_req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const planos = await prisma.planoFidelidade.findMany({
    where: { salonId },
    include: {
      _count: { select: { clientesPlano: { where: { ativo: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(planos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });
  }

  const plano = await prisma.planoFidelidade.create({
    data: { ...parsed.data, salonId },
  });

  return NextResponse.json(plano, { status: 201 });
}
