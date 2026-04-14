export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { addMonths, addWeeks, addDays } from "date-fns";

const enrollSchema = z.object({
  clienteId: z.string(),
  planoId: z.string(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const planoId = searchParams.get("planoId");
  const ativo = searchParams.get("ativo");

  const clientesPlano = await prisma.clientePlano.findMany({
    where: {
      salonId,
      ...(planoId ? { planoId } : {}),
      ...(ativo !== null ? { ativo: ativo === "true" } : {}),
    },
    include: {
      cliente: { include: { user: { select: { name: true, phone: true } } } },
      plano: { select: { nome: true, periodicidade: true, qtdAtendimentos: true, valor: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(clientesPlano);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = enrollSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { clienteId, planoId } = parsed.data;

  const plano = await prisma.planoFidelidade.findFirst({ where: { id: planoId, salonId, ativo: true } });
  if (!plano) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });

  const cliente = await prisma.cliente.findFirst({ where: { id: clienteId, salonId } });
  if (!cliente) return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });

  // Check if client already has an active plan
  const existing = await prisma.clientePlano.findFirst({
    where: { clienteId, salonId, ativo: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Cliente já possui um plano ativo" }, { status: 409 });
  }

  const dataInicio = new Date();
  let dataFim: Date;
  switch (plano.periodicidade) {
    case "SEMANAL": dataFim = addWeeks(dataInicio, 1); break;
    case "QUINZENAL": dataFim = addDays(dataInicio, 15); break;
    default: dataFim = addMonths(dataInicio, 1);
  }

  const clientePlano = await prisma.clientePlano.create({
    data: { salonId, clienteId, planoId, dataInicio, dataFim },
    include: {
      plano: { select: { nome: true } },
      cliente: { include: { user: { select: { name: true } } } },
    },
  });

  return NextResponse.json(clientePlano, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });

  const existing = await prisma.clientePlano.findFirst({ where: { id, salonId } });
  if (!existing) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  await prisma.clientePlano.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
