export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const DEFAULTS: Record<string, number> = { BASICO: 60, PRATA: 150, OURO: 250, PLATINA: 0 };

async function requireMaster() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { session };
}

export async function GET() {
  const { error } = await requireMaster();
  if (error) return error;

  const rows = await prisma.planoPreco.findMany({ orderBy: { tipo: "asc" } });
  const map: Record<string, number> = { ...DEFAULTS };
  for (const r of rows) map[r.tipo] = Number(r.preco);

  return NextResponse.json(map);
}

export async function PUT(req: NextRequest) {
  const { error } = await requireMaster();
  if (error) return error;

  const body: Record<string, number> = await req.json();

  await Promise.all(
    Object.entries(body)
      .filter(([, v]) => typeof v === "number" && v >= 0)
      .map(([tipo, preco]) =>
        prisma.planoPreco.upsert({
          where: { tipo },
          update: { preco },
          create: { tipo, preco },
        })
      )
  );

  const rows = await prisma.planoPreco.findMany({ orderBy: { tipo: "asc" } });
  const map: Record<string, number> = { ...DEFAULTS };
  for (const r of rows) map[r.tipo] = Number(r.preco);

  return NextResponse.json(map);
}

// POST: criar novo plano customizado
export async function POST(req: NextRequest) {
  const { error } = await requireMaster();
  if (error) return error;

  const { tipo, preco }: { tipo: string; preco: number } = await req.json();
  if (!tipo || typeof preco !== "number") {
    return NextResponse.json({ error: "tipo e preco obrigatórios" }, { status: 400 });
  }

  const row = await prisma.planoPreco.upsert({
    where: { tipo: tipo.toUpperCase() },
    update: { preco },
    create: { tipo: tipo.toUpperCase(), preco },
  });

  return NextResponse.json({ tipo: row.tipo, preco: Number(row.preco) }, { status: 201 });
}

// DELETE: remover plano customizado (não pode remover os 4 base)
export async function DELETE(req: NextRequest) {
  const { error } = await requireMaster();
  if (error) return error;

  const { tipo }: { tipo: string } = await req.json();
  if (["BASICO", "PRATA", "OURO", "PLATINA"].includes(tipo?.toUpperCase())) {
    return NextResponse.json({ error: "Planos base não podem ser removidos" }, { status: 400 });
  }

  await prisma.planoPreco.deleteMany({ where: { tipo: tipo.toUpperCase() } });
  return NextResponse.json({ ok: true });
}
