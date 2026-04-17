/**
 * POST /api/pagamentos/pix
 * Cria cobrança Woovi PIX para um agendamento.
 * Body: { agendamentoId: string }
 * Response: { correlationID, brCode, qrCodeImage, value }
 *
 * GET /api/pagamentos/pix?correlationId=xxx
 * Consulta status da cobrança (polling do frontend).
 * Response: { status: "ACTIVE" | "COMPLETED" | "EXPIRED" }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { wooviCreateCharge, wooviGetCharge } from "@/lib/woovi";

/* ─── POST: criar cobrança ─────────────────────────────────────────────────── */
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

  // Reutiliza correlationId se já existir
  if (ag.wooviCorrelationId) {
    try {
      const existing = await wooviGetCharge(ag.wooviCorrelationId);
      if (existing.status === "ACTIVE") {
        // Recria a cobrança para buscar brCode atualizado
        const charge = await wooviCreateCharge({
          correlationID: `${ag.id}-${Date.now()}`,
          value: Math.round(Number(ag.totalPrice) * 100),
          comment: `Atendimento — ${ag.salon.name}`,
        });
        await prisma.agendamento.update({
          where: { id: ag.id },
          data: { wooviCorrelationId: charge.correlationID },
        });
        return NextResponse.json({ ...charge, value: Number(ag.totalPrice) });
      }
      if (existing.status === "COMPLETED") {
        return NextResponse.json({ error: "Pagamento já confirmado" }, { status: 409 });
      }
    } catch {
      // correlationId inválido — cria novo
    }
  }

  const value = Math.round(Number(ag.totalPrice) * 100);
  if (value < 1) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const correlationID = `${ag.id}-${Date.now()}`;
  const charge = await wooviCreateCharge({
    correlationID,
    value,
    comment: `Atendimento — ${ag.salon.name}`,
  });

  await prisma.agendamento.update({
    where: { id: ag.id },
    data: { wooviCorrelationId: charge.correlationID },
  });

  return NextResponse.json({ ...charge, value: Number(ag.totalPrice) });
}

/* ─── GET: polling de status ───────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const correlationId = req.nextUrl.searchParams.get("correlationId");
  if (!correlationId) {
    return NextResponse.json({ error: "correlationId obrigatório" }, { status: 400 });
  }

  const { status } = await wooviGetCharge(correlationId);
  return NextResponse.json({ status });
}
