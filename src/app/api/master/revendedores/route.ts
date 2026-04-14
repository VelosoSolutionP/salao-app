import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const revendedores = await prisma.revendedor.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      indicacoes: {
        include: {
          salon: { select: { id: true, name: true } },
        },
      },
      comissoes: {
        select: { valor: true, pago: true },
      },
    },
  });

  const data = revendedores.map((r) => ({
    ...r,
    totalIndicacoes: r.indicacoes.length,
    convertidas: r.indicacoes.filter((i) => i.status === "CONVERTIDA").length,
    comissaoTotal: r.comissoes.reduce((s, c) => s + Number(c.valor), 0),
    comissaoPendente: r.comissoes.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor), 0),
  }));

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { nome, email, telefone, percentual, observacao } = await request.json();
  if (!nome) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });

  // Gera código único
  const codigo = nanoid(8).toUpperCase();

  const revendedor = await prisma.revendedor.create({
    data: { nome, email, telefone, percentual: percentual ?? 10, codigo, observacao },
  });

  return NextResponse.json(revendedor);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, ativo, percentual, comissaoId, nome, email, telefone, observacao } = body;

  if (comissaoId) {
    const c = await prisma.comissao.update({
      where: { id: comissaoId },
      data: { pago: true, pagoEm: new Date() },
    });
    return NextResponse.json(c);
  }

  const rev = await prisma.revendedor.update({
    where: { id },
    data: {
      ...(ativo !== undefined && { ativo }),
      ...(percentual !== undefined && { percentual }),
      ...(nome !== undefined && { nome }),
      ...(email !== undefined && { email: email || null }),
      ...(telefone !== undefined && { telefone: telefone || null }),
      ...(observacao !== undefined && { observacao: observacao || null }),
    },
  });
  return NextResponse.json(rev);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.revendedor.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
