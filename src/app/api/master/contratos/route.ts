import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { salonId, valorMensal, diaVencimento, observacao } = body;

  if (!salonId || !valorMensal) {
    return NextResponse.json({ error: "salonId e valorMensal são obrigatórios" }, { status: 400 });
  }

  // Desativa contrato anterior se existir
  await prisma.contratoSalao.updateMany({
    where: { salonId, ativo: true },
    data: { ativo: false },
  });

  const contrato = await prisma.contratoSalao.create({
    data: {
      salonId,
      valorMensal,
      diaVencimento: diaVencimento ?? 10,
      observacao,
    },
  });

  return NextResponse.json(contrato);
}

export async function PATCH(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { id, pago, referencia, valor } = body;

  if (pago !== undefined) {
    const pagamento = await prisma.pagamentoContrato.upsert({
      where: { id: id ?? "new" },
      update: { pago, pagoEm: pago ? new Date() : null },
      create: {
        contratoId: body.contratoId,
        valor,
        referencia,
        pago: true,
        pagoEm: new Date(),
      },
    });
    return NextResponse.json(pagamento);
  }

  return NextResponse.json({ error: "Ação inválida" }, { status: 400 });
}
