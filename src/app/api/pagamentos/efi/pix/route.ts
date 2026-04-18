/**
 * POST /api/pagamentos/efi/pix
 * Cria cobrança Efi Pro PIX para um agendamento.
 * Body: { agendamentoId: string }
 * Response: { txid, brCode, qrCodeImage, valor, mockMode }
 *
 * GET /api/pagamentos/efi/pix?txid=xxx
 * Polling de status. Atualiza pagamentoStatus quando CONCLUIDA.
 * Response: { status, valor?, pagador?, mockMode }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  efiCreatePix,
  efiGetPixStatus,
  generateEfiTxid,
  isMockMode,
} from "@/lib/efi";

/* ─── POST: criar cobrança ─────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let body: { agendamentoId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { agendamentoId } = body;
  if (!agendamentoId) {
    return NextResponse.json({ error: "agendamentoId obrigatório" }, { status: 400 });
  }

  const ag = await prisma.agendamento.findUnique({
    where: { id: agendamentoId },
    include: { salon: { select: { name: true } } },
  });

  if (!ag) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  if (ag.pagamentoStatus === "PAGO") {
    return NextResponse.json({ error: "Agendamento já pago" }, { status: 409 });
  }

  const valor = Number(ag.totalPrice);
  if (valor < 0.01) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  // Formata valor com 2 casas decimais (ex: "59.90")
  const valorStr = valor.toFixed(2);

  // Reutiliza txid existente ou gera novo
  const txid = ag.efiTxid ?? generateEfiTxid(ag.id);

  const result = await efiCreatePix({
    txid,
    valor: valorStr,
    descricao: `Atendimento — ${ag.salon.name}`,
  });

  // Persiste o txid no agendamento
  if (!ag.efiTxid || ag.efiTxid !== txid) {
    await prisma.agendamento.update({
      where: { id: ag.id },
      data: { efiTxid: result.txid },
    });
  }

  return NextResponse.json({
    txid: result.txid,
    brCode: result.brCode,
    qrCodeImage: result.qrCodeImage,
    valor,
    mockMode: result.mockMode,
  });
}

/* ─── GET: polling de status ───────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const txid = req.nextUrl.searchParams.get("txid");
  if (!txid) {
    return NextResponse.json({ error: "txid obrigatório" }, { status: 400 });
  }

  const statusData = await efiGetPixStatus(txid);

  // Quando pago, atualiza o agendamento
  if (statusData.status === "CONCLUIDA") {
    const ag = await prisma.agendamento.findFirst({
      where: { efiTxid: txid },
    });

    if (ag && ag.pagamentoStatus !== "PAGO") {
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
    }
  }

  return NextResponse.json({
    status: statusData.status,
    valor: statusData.valor,
    pagador: statusData.pagador,
    mockMode: isMockMode(),
  });
}
