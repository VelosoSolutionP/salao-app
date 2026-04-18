/**
 * POST /api/webhook/efi
 *
 * Recebe notificações de pagamento PIX da Efi Pro.
 * Formato do payload:
 *   { pix: [{ txid, valor, horario, infoPagador?: { nome?, cpf? } }] }
 *
 * Para cada entrada:
 *   - Busca Agendamento por efiTxid → marca PAGO, cria Transacao
 *   - OU busca PagamentoContrato por efiTxid → marca pago=true
 *
 * Valida assinatura HMAC-SHA256 via header x-efi-signature quando
 * EFI_WEBHOOK_SECRET está configurado.
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

interface EfiPixEntry {
  txid: string;
  valor: string;
  horario?: string;
  infoPagador?: {
    nome?: string;
    cpf?: string;
  };
}

interface EfiWebhookPayload {
  pix?: EfiPixEntry[];
}

async function processPixEntry(entry: EfiPixEntry): Promise<void> {
  const { txid, valor } = entry;

  // ── Tenta Agendamento ────────────────────────────────────────────────────
  const ag = await prisma.agendamento.findFirst({
    where: { efiTxid: txid },
  });

  if (ag) {
    if (ag.pagamentoStatus === "PAGO") return; // idempotente

    await prisma.$transaction(async (tx) => {
      await tx.agendamento.update({
        where: { id: ag.id },
        data: {
          pagamentoStatus: "PAGO",
          pagamento: "PIX",
          status: "CONCLUIDO",
        },
      });

      await tx.transacao.upsert({
        where: { agendamentoId: ag.id },
        create: {
          salonId: ag.salonId,
          agendamentoId: ag.id,
          tipo: "RECEITA",
          valor: ag.totalPrice,
          descricao: "Pagamento PIX (Efi Pro)",
          metodo: "PIX",
          dataTransacao: new Date(),
        },
        update: {},
      });
    });

    return;
  }

  // ── Tenta PagamentoContrato ──────────────────────────────────────────────
  const pc = await prisma.pagamentoContrato.findFirst({
    where: { efiTxid: txid },
    include: {
      contrato: {
        include: {
          salon: {
            include: { owner: true },
          },
        },
      },
    },
  });

  if (pc) {
    if (pc.pago) return; // idempotente

    await prisma.pagamentoContrato.update({
      where: { id: pc.id },
      data: {
        pago: true,
        pagoEm: new Date(),
        // Atualiza valor recebido se diferente (pode diferir por arredondamento)
        valor: valor ? parseFloat(valor) : pc.valor,
      },
    });

    // Desbloqueia owner se estava bloqueado por inadimplência
    const owner = pc.contrato.salon.owner;
    if (owner.blocked) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { blocked: false },
      });
    }
  }
}

export async function POST(req: NextRequest) {
  const body = await req.text();

  // ── Validação de assinatura (produção) ───────────────────────────────────
  const secret = process.env.EFI_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get("x-efi-signature") ?? "";
    const expected = crypto
      .createHmac("sha256", secret)
      .update(body)
      .digest("hex");

    if (sig !== expected) {
      return NextResponse.json({ error: "Assinatura inválida" }, { status: 401 });
    }
  }

  let payload: EfiWebhookPayload;
  try {
    payload = JSON.parse(body) as EfiWebhookPayload;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const entries = payload.pix;
  if (!Array.isArray(entries) || entries.length === 0) {
    // Pode ser um ping/heartbeat da Efi — acknowledge
    return NextResponse.json({ ok: true });
  }

  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.txid) continue;
    try {
      await processPixEntry(entry);
    } catch (err) {
      console.error(`[Efi Webhook] Erro processando txid=${entry.txid}:`, err);
      errors.push(entry.txid);
    }
  }

  if (errors.length > 0) {
    // Retorna 200 mesmo com erros parciais para evitar reenvios em loop;
    // loga para investigação manual.
    console.error(`[Efi Webhook] txids com erro: ${errors.join(", ")}`);
  }

  return NextResponse.json({ ok: true });
}
