/**
 * POST /api/webhook/woovi
 *
 * Recebe eventos da Woovi. Evento principal:
 *   OPENPIX:CHARGE_COMPLETED — cobrança PIX paga
 *
 * Woovi envia header `x-webhook-signature` com HMAC-SHA1.
 * Em produção valide usando WOOVI_WEBHOOK_SECRET.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const body = await req.text();

  // ── Validação de assinatura (produção) ──────────────────────────────────
  const secret = process.env.WOOVI_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-webhook-signature") ?? "";
    const expected = crypto
      .createHmac("sha1", secret)
      .update(body)
      .digest("hex");
    if (sig !== expected) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  let payload: { event?: string; charge?: { correlationID?: string; status?: string } };
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (payload.event !== "OPENPIX:CHARGE_COMPLETED") {
    // Outros eventos — apenas acknowledge
    return NextResponse.json({ ok: true });
  }

  const correlationID = payload.charge?.correlationID;
  if (!correlationID) {
    return NextResponse.json({ error: "correlationID ausente" }, { status: 400 });
  }

  // Busca o agendamento pelo correlationId
  const ag = await prisma.agendamento.findFirst({
    where: { wooviCorrelationId: correlationID },
  });

  if (!ag) {
    // Pode ser outro evento (ex: plano) — ignora sem erro
    return NextResponse.json({ ok: true });
  }

  if (ag.pagamentoStatus === "PAGO") {
    return NextResponse.json({ ok: true }); // idempotente
  }

  // Marca como pago e cria comissão se necessário
  await prisma.$transaction(async (tx) => {
    await tx.agendamento.update({
      where: { id: ag.id },
      data: {
        pagamentoStatus: "PAGO",
        pagamento: "PIX",
        status: "CONCLUIDO",
      },
    });

    // Cria transação financeira
    await tx.transacao.upsert({
      where: { agendamentoId: ag.id },
      create: {
        salonId: ag.salonId,
        agendamentoId: ag.id,
        tipo: "RECEITA",
        valor: ag.totalPrice,
        descricao: "Pagamento PIX (Woovi)",
        dataTransacao: new Date(),
      },
      update: {},
    });
  });

  return NextResponse.json({ ok: true });
}
