export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const representantes = await prisma.representante.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      salons: { select: { id: true, name: true, city: true } },
      comissoes: { select: { valor: true, pago: true } },
    },
  });

  return NextResponse.json(
    representantes.map((r) => ({
      ...r,
      totalSaloes: r.salons.length,
      totalComissao: r.comissoes.reduce((s, c) => s + Number(c.valor), 0),
      totalPendente: r.comissoes.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor), 0),
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { nome, email, telefone, regiao, percentual, observacao } = await req.json();
  if (!nome) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });
  if (!regiao) return NextResponse.json({ error: "regiao obrigatória" }, { status: 400 });

  // Warn if another active rep already has this region
  const conflict = await prisma.representante.findFirst({
    where: { regiao: { equals: regiao, mode: "insensitive" }, ativo: true },
  });
  if (conflict) {
    return NextResponse.json(
      { error: `Região "${regiao}" já está com ${conflict.nome}`, conflict: true },
      { status: 409 }
    );
  }

  const rep = await prisma.representante.create({
    data: {
      nome,
      email: email || null,
      telefone: telefone || null,
      regiao,
      percentual: percentual ?? 10,
      observacao: observacao || null,
    },
  });
  return NextResponse.json(rep, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, comissaoId, ...fields } = body;

  if (comissaoId) {
    const c = await prisma.comissaoRepresentante.update({
      where: { id: comissaoId },
      data: { pago: true, pagoEm: new Date() },
    });
    return NextResponse.json(c);
  }

  if (body.addComissao) {
    const { representanteId, descricao, valor, referencia } = body.addComissao;
    const c = await prisma.comissaoRepresentante.create({
      data: { representanteId, descricao, valor, referencia },
    });
    return NextResponse.json(c);
  }

  // Check region conflict on edit (only if region changed)
  if (fields.regiao) {
    const conflict = await prisma.representante.findFirst({
      where: { regiao: { equals: fields.regiao, mode: "insensitive" }, ativo: true, NOT: { id } },
    });
    if (conflict) {
      return NextResponse.json(
        { error: `Região "${fields.regiao}" já está com ${conflict.nome}`, conflict: true },
        { status: 409 }
      );
    }
  }

  const rep = await prisma.representante.update({
    where: { id },
    data: {
      nome: fields.nome,
      email: fields.email || null,
      telefone: fields.telefone || null,
      regiao: fields.regiao,
      percentual: fields.percentual,
      observacao: fields.observacao || null,
      ...(fields.ativo !== undefined && { ativo: fields.ativo }),
    },
  });
  return NextResponse.json(rep);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.representante.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
