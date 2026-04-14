export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const indicadores = await prisma.indicador.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      comissoes: { select: { valor: true, pago: true, ehBonus: true } },
    },
  });

  return NextResponse.json(
    indicadores.map((ind) => ({
      ...ind,
      totalComissao: ind.comissoes.reduce((s, c) => s + Number(c.valor), 0),
      totalPendente: ind.comissoes.filter((c) => !c.pago).reduce((s, c) => s + Number(c.valor), 0),
      totalContratos: ind.comissoes.length,
    }))
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { nome, email, telefone, comissaoPorContrato, contratosBonus, observacao } = await req.json();
  if (!nome) return NextResponse.json({ error: "nome obrigatório" }, { status: 400 });

  const ind = await prisma.indicador.create({
    data: {
      nome,
      email: email || null,
      telefone: telefone || null,
      comissaoPorContrato: comissaoPorContrato ?? 50,
      contratosBonus: contratosBonus ?? 2,
      observacao: observacao || null,
    },
  });
  return NextResponse.json(ind, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { id, comissaoId, pago, ...fields } = body;

  // Mark commission as paid
  if (comissaoId) {
    const c = await prisma.comissaoIndicador.update({
      where: { id: comissaoId },
      data: { pago: true, pagoEm: new Date() },
    });
    return NextResponse.json(c);
  }

  // Add a commission record
  if (body.addComissao) {
    const { indicadorId, descricao, valor, ehBonus, referencia } = body.addComissao;
    const c = await prisma.comissaoIndicador.create({
      data: { indicadorId, descricao, valor, ehBonus: ehBonus ?? false, referencia },
    });
    return NextResponse.json(c);
  }

  const ind = await prisma.indicador.update({
    where: { id },
    data: {
      nome: fields.nome,
      email: fields.email || null,
      telefone: fields.telefone || null,
      comissaoPorContrato: fields.comissaoPorContrato,
      contratosBonus: fields.contratosBonus,
      observacao: fields.observacao || null,
      ...(fields.ativo !== undefined && { ativo: fields.ativo }),
    },
  });
  return NextResponse.json(ind);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.indicador.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
