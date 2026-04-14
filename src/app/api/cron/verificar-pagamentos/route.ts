/**
 * Cron: roda diariamente às 9h
 * - Gera registros de pagamento do mês atual para contratos ativos
 * - Envia WhatsApp de aviso 3 dias antes do vencimento
 * - Bloqueia automaticamente após 5 dias de atraso
 */
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp, msgVencimentoProximo, msgVencido } from "@/lib/whatsapp";
import { criarLinkPagamento } from "@/lib/mercadopago";
import { format, differenceInDays, setDate } from "date-fns";

const CRON_SECRET = process.env.CRON_SECRET ?? "veloso-cron-2025";

export async function GET(req: NextRequest) {
  // Vercel Cron sends Authorization header; also allow direct call with secret
  const auth = req.headers.get("authorization");
  const secret = req.nextUrl.searchParams.get("secret");
  if (auth !== `Bearer ${CRON_SECRET}` && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hoje = new Date();
  const mesAtual = format(hoje, "yyyy-MM");
  const log: string[] = [];

  // Busca todos os contratos ativos com dados do salão e owner
  const contratos = await prisma.contratoSalao.findMany({
    where: { ativo: true },
    include: {
      salon: {
        include: {
          owner: { select: { id: true, name: true, phone: true, blocked: true } },
        },
      },
    },
  });

  for (const contrato of contratos) {
    const owner = contrato.salon.owner;
    const salonName = contrato.salon.name;
    const valor = Number(contrato.valorMensal).toFixed(2).replace(".", ",");

    // Data de vencimento deste mês
    const diaVenc = Math.min(contrato.diaVencimento, 28);
    const vencimento = setDate(new Date(hoje.getFullYear(), hoje.getMonth(), 1), diaVenc);

    // Garantir que existe registro de pagamento do mês
    let pagamento = await prisma.pagamentoContrato.findFirst({
      where: { contratoId: contrato.id, referencia: mesAtual },
    });

    if (!pagamento) {
      pagamento = await prisma.pagamentoContrato.create({
        data: {
          contratoId: contrato.id,
          valor: contrato.valorMensal,
          referencia: mesAtual,
          vencimento,
          pago: false,
        },
      });
      log.push(`[CRIADO] Pagamento ${mesAtual} para ${salonName}`);
    }

    // Gera link MP se ainda não tem
    if (!pagamento.linkPagamento && process.env.MP_ACCESS_TOKEN) {
      try {
        const { preferenciaId, link } = await criarLinkPagamento({
          pagamentoId: pagamento.id,
          salonName,
          valor: Number(contrato.valorMensal),
          referencia: mesAtual,
        });
        await prisma.pagamentoContrato.update({
          where: { id: pagamento.id },
          data: { mpPreferenciaId: preferenciaId, linkPagamento: link },
        });
        pagamento = { ...pagamento, linkPagamento: link };
        log.push(`[MP] Link gerado para ${salonName}`);
      } catch (e) {
        log.push(`[MP] Erro ao gerar link para ${salonName}: ${e}`);
      }
    }

    if (pagamento.pago) continue; // Já pago, skip

    const diasAtraso = differenceInDays(hoje, vencimento);
    const diasParaVencer = differenceInDays(vencimento, hoje);

    // ── Bloqueio automático após 5 dias de atraso ───────────────────────────
    if (diasAtraso >= 5 && !owner.blocked) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { blocked: true },
      });
      log.push(`[BLOQUEADO] ${owner.name} — ${salonName} (${diasAtraso} dias atraso)`);

      if (owner.phone && !pagamento.notificado) {
        await sendWhatsApp(owner.phone, msgVencido(salonName, diasAtraso, valor));
        await prisma.pagamentoContrato.update({ where: { id: pagamento.id }, data: { notificado: true } });
        log.push(`[WHATSAPP] Bloqueio notificado → ${owner.phone}`);
      }
      continue;
    }

    const linkMsg = pagamento.linkPagamento ? `\n\nPague agora: ${pagamento.linkPagamento}` : "";

    // ── Aviso de vencimento próximo (3 dias antes) ──────────────────────────
    if (diasParaVencer === 3 && owner.phone && !pagamento.notificado) {
      await sendWhatsApp(owner.phone, msgVencimentoProximo(salonName, diasParaVencer, valor) + linkMsg);
      await prisma.pagamentoContrato.update({ where: { id: pagamento.id }, data: { notificado: true } });
      log.push(`[WHATSAPP] Vencimento em 3 dias → ${owner.phone}`);
      continue;
    }

    // ── Aviso de atraso (dias 1, 2, 3, 4 após vencimento) ──────────────────
    if (diasAtraso > 0 && diasAtraso < 5 && owner.phone && !pagamento.notificado) {
      await sendWhatsApp(owner.phone, msgVencido(salonName, diasAtraso, valor) + linkMsg);
      await prisma.pagamentoContrato.update({ where: { id: pagamento.id }, data: { notificado: true } });
      log.push(`[WHATSAPP] Atraso ${diasAtraso}d notificado → ${owner.phone}`);
    }
  }

  console.log("[CRON verificar-pagamentos]", log);
  return NextResponse.json({ ok: true, processados: contratos.length, log });
}
