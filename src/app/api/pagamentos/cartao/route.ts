export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { efiCreateCartaoLink } from "@/lib/efi";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { agendamentoId } = await req.json();
  if (!agendamentoId) {
    return NextResponse.json({ error: "agendamentoId obrigatório" }, { status: 400 });
  }

  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { salon: { select: { name: true } } },
  });

  if (!ag) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  if (ag.pagamentoStatus === "PAGO") {
    return NextResponse.json({ error: "Agendamento já pago" }, { status: 409 });
  }

  const valor = Number(ag.totalPrice);
  if (valor < 0.01) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const result = await efiCreateCartaoLink({
    valor,
    descricao: `Agendamento — ${ag.salon?.name ?? "Salão"}`,
  });

  return NextResponse.json({
    link: result.link,
    chargeId: result.chargeId,
    mockMode: result.mockMode,
    value: valor,
  });
}
