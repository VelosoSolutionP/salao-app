/**
 * POST /api/pagamentos/efi/contrato
 * Cria cobrança Efi Pro PIX com vencimento para mensalidade de contrato.
 * Body: { contratoId: string; referencia: string }
 * Response: { txid, brCode, qrCodeImage, valor, vencimento, mockMode }
 *
 * Requer role MASTER ou OWNER.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  efiCreatePixContrato,
  generateEfiTxid,
  isMockMode,
} from "@/lib/efi";

/* ─── Helpers ────────────────────────────────────────────────────────────────── */

/**
 * Dado um contrato com diaVencimento e a referencia "YYYY-MM",
 * retorna a data de vencimento como "YYYY-MM-DD".
 */
function calcularVencimento(referencia: string, diaVencimento: number): string {
  const [year, month] = referencia.split("-").map(Number);
  // Clamp ao último dia do mês caso diaVencimento > dias no mês
  const lastDay = new Date(year, month, 0).getDate();
  const dia = Math.min(diaVencimento, lastDay);
  return `${year}-${String(month).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

/* ─── POST ──────────────────────────────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const role = session.user.role as string;
  if (role !== "MASTER" && role !== "OWNER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  let body: { contratoId?: string; referencia?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { contratoId, referencia } = body;
  if (!contratoId || !referencia) {
    return NextResponse.json(
      { error: "contratoId e referencia são obrigatórios" },
      { status: 400 }
    );
  }

  // Valida formato de referencia "YYYY-MM"
  if (!/^\d{4}-\d{2}$/.test(referencia)) {
    return NextResponse.json(
      { error: "referencia deve estar no formato YYYY-MM" },
      { status: 400 }
    );
  }

  // Busca contrato ativo com salão
  const contrato = await prisma.contratoSalao.findFirst({
    where: { id: contratoId, ativo: true },
    include: { salon: { select: { name: true } } },
  });

  if (!contrato) {
    return NextResponse.json({ error: "Contrato não encontrado ou inativo" }, { status: 404 });
  }

  // OWNER só pode ver seu próprio salão
  if (role === "OWNER") {
    const salonId = session.user.salonId;
    if (contrato.salonId !== salonId) {
      return NextResponse.json({ error: "Sem permissão para este contrato" }, { status: 403 });
    }
  }

  const vencimento = calcularVencimento(referencia, contrato.diaVencimento);
  const valor = Number(contrato.valorMensal);
  const valorStr = valor.toFixed(2);

  // Cria ou reutiliza PagamentoContrato para esta referencia
  let pagamento = await prisma.pagamentoContrato.findFirst({
    where: { contratoId, referencia },
  });

  if (!pagamento) {
    pagamento = await prisma.pagamentoContrato.create({
      data: {
        contratoId,
        valor: contrato.valorMensal,
        referencia,
        vencimento: new Date(vencimento),
        pago: false,
      },
    });
  }

  if (pagamento.pago) {
    return NextResponse.json({ error: "Mensalidade já paga para esta referencia" }, { status: 409 });
  }

  // Gera ou reutiliza txid
  const txid = pagamento.efiTxid ?? generateEfiTxid(`c${pagamento.id}`);

  const result = await efiCreatePixContrato({
    txid,
    valor: valorStr,
    vencimento,
    salonName: contrato.salon.name,
    referencia,
  });

  // Persiste txid
  if (!pagamento.efiTxid || pagamento.efiTxid !== txid) {
    await prisma.pagamentoContrato.update({
      where: { id: pagamento.id },
      data: { efiTxid: result.txid },
    });
  }

  return NextResponse.json({
    txid: result.txid,
    brCode: result.brCode,
    qrCodeImage: result.qrCodeImage,
    valor,
    vencimento,
    mockMode: result.mockMode,
    pagamentoId: pagamento.id,
  });
}
