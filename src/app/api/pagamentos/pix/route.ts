/**
 * POST /api/pagamentos/pix
 * Gera cobrança PIX para agendamento usando chave Inter configurada.
 * Retorna brCode + qrCodeImage gerados server-side.
 *
 * GET /api/pagamentos/pix?txid=xxx
 * Consulta status (sempre retorna ATIVA — confirmação é manual).
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildFallbackBrCode, generateQrImage, generateEfiTxid } from "@/lib/efi";

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
    include: { salon: { select: { name: true, pixKey: true } } },
  });

  if (!ag) return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  if (ag.pagamentoStatus === "PAGO") {
    return NextResponse.json({ error: "Agendamento já pago" }, { status: 409 });
  }

  const valor = Number(ag.totalPrice);
  if (valor < 0.01) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  // Prioridade: chave do salão → env → chave Inter padrão
  const INTER_KEY = "8ab74c98-5042-4c52-9578-41e10b85cad1";
  const pixKey = ag.salon?.pixKey || process.env.EFI_PIX_KEY || INTER_KEY;

  const txid    = generateEfiTxid("AGD");
  const brCode  = buildFallbackBrCode(txid, valor.toFixed(2), pixKey);
  const qrCodeImage = await generateQrImage(brCode);

  return NextResponse.json({
    txid,
    brCode,
    qrCodeImage,
    correlationID: null,
    value: valor,
  });
}

/* ─── GET: status (confirmação manual) ────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  void req;
  return NextResponse.json({ status: "ATIVA" });
}
