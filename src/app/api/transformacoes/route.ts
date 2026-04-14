export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireSalon } from "@/lib/auth-guard";

// GET — list transformations for the active salon
export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const tipo = req.nextUrl.searchParams.get("tipo");
  const transformacoes = await prisma.transformacao.findMany({
    where: { salonId, ...(tipo ? { tipo: tipo as any } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return NextResponse.json(transformacoes);
}

// POST — create new transformation
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const { clienteNome, clienteId, tipo, fotoAntes, fotoDepois, colorimetria, observacao } = body;

  if (!clienteNome || !tipo) {
    return NextResponse.json({ error: "Nome do cliente e tipo são obrigatórios" }, { status: 400 });
  }

  const t = await prisma.transformacao.create({
    data: {
      salonId,
      clienteNome,
      clienteId: clienteId || null,
      tipo,
      fotoAntes: fotoAntes || null,
      fotoDepois: fotoDepois || null,
      colorimetria: colorimetria || null,
      observacao: observacao || null,
    },
  });

  return NextResponse.json(t, { status: 201 });
}

// PATCH — update transformation (add after photo, consent, etc.)
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const { id, ...updates } = body;
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const t = await prisma.transformacao.update({
    where: { id, salonId },
    data: updates,
  });

  return NextResponse.json(t);
}

// DELETE
export async function DELETE(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  await prisma.transformacao.delete({ where: { id, salonId } });
  return NextResponse.json({ ok: true });
}
