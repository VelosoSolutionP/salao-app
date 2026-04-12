export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const createSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.enum(["DESCONTO", "FIDELIDADE", "PRIMEIRO_AGENDAMENTO", "ANIVERSARIO", "PACOTE"]),
  desconto: z.number().positive().optional(),
  tipoDesconto: z.enum(["PERCENTUAL", "FIXO"]).optional(),
  codigo: z.string().optional(),
  validaDe: z.string().datetime().optional(),
  validaAte: z.string().datetime().optional(),
  usosMax: z.number().int().positive().optional(),
  servicoIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const ativa = searchParams.get("ativa");

  const campanhas = await prisma.campanha.findMany({
    where: {
      salonId: salonId!,
      ...(ativa !== null ? { ativa: ativa === "true" } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(campanhas);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.codigo) {
    const existing = await prisma.campanha.findUnique({
      where: { codigo: parsed.data.codigo },
    });
    if (existing) {
      return NextResponse.json({ error: "Código já em uso" }, { status: 409 });
    }
  }

  const campanha = await prisma.campanha.create({
    data: {
      salonId: salonId!,
      ...parsed.data,
      validaDe: parsed.data.validaDe ? new Date(parsed.data.validaDe) : undefined,
      validaAte: parsed.data.validaAte ? new Date(parsed.data.validaAte) : undefined,
    },
  });

  return NextResponse.json(campanha, { status: 201 });
}
