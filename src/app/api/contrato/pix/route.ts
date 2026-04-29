export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { buildFallbackBrCode, generateQrImage } from "@/lib/efi";
import { getPlano, PlanoTipo } from "@/lib/planos";
import crypto from "crypto";

const INTER_PIX_KEY = "8ab74c98-5042-4c52-9578-41e10b85cad1";

// POST — gera PIX para mensalidade do plano
export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const { salonId, error: salonErr } = await requireSalon(session!);
  if (salonErr) return salonErr;

  const body = await req.json().catch(() => ({}));
  const planoTipo = (body.plano as PlanoTipo) ?? "BASICO";
  const config = getPlano(planoTipo);

  if (!config.preco) {
    return NextResponse.json({ error: "Plano Platina requer contato com consultor" }, { status: 400 });
  }

  const referencia = new Date().toISOString().slice(0, 7); // "2026-04"
  const txid = crypto.randomBytes(16).toString("hex");
  const valor = config.preco.toFixed(2);

  const brCode = buildFallbackBrCode(txid, valor, INTER_PIX_KEY);
  const qrCodeImage = await generateQrImage(brCode);

  // Garante que há um contrato ativo para este salão
  let contrato = await prisma.contratoSalao.findFirst({
    where: { salonId, ativo: true },
    orderBy: { createdAt: "desc" },
  });

  if (!contrato) {
    contrato = await prisma.contratoSalao.create({
      data: {
        salonId,
        plano: planoTipo,
        valorMensal: config.preco,
        diaVencimento: 10,
        ativo: true,
      },
    });
  }

  // Cria registro de pagamento pendente
  const vencimento = new Date();
  vencimento.setDate(contrato.diaVencimento);
  if (vencimento < new Date()) vencimento.setMonth(vencimento.getMonth() + 1);

  const pagamento = await prisma.pagamentoContrato.create({
    data: {
      contratoId: contrato.id,
      valor: config.preco,
      referencia,
      vencimento,
      efiTxid: txid,
    },
  });

  return NextResponse.json({ txid, brCode, qrCodeImage, pagamentoId: pagamento.id, valor: config.preco });
}

// PATCH — confirma pagamento manualmente
export async function PATCH(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  const { pagamentoId } = body;
  if (!pagamentoId) return NextResponse.json({ error: "pagamentoId obrigatório" }, { status: 400 });

  const pagamento = await prisma.pagamentoContrato.findUnique({
    where: { id: pagamentoId },
    include: { contrato: { select: { salonId: true, plano: true } } },
  });
  if (!pagamento) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const updated = await prisma.pagamentoContrato.update({
    where: { id: pagamentoId },
    data: { pago: true, pagoEm: new Date() },
  });

  // Registra no financeiro como DESPESA do salão (mensalidade paga)
  const salonId = pagamento.contrato.salonId;
  const plano = getPlano(pagamento.contrato.plano);
  await prisma.transacao.create({
    data: {
      salonId,
      tipo: "DESPESA",
      descricao: `Mensalidade Bellefy — Plano ${plano.nome} (${pagamento.referencia})`,
      valor: pagamento.valor,
      metodo: "PIX",
      categoria: "Mensalidade",
    },
  });

  return NextResponse.json({ ok: true, pagamento: updated });
}
