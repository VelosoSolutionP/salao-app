export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSalon } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { efiCreatePix, efiGetPixStatus, generateEfiTxid, isMockMode } from "@/lib/efi";

/* ── POST: criar cobrança PIX para venda PDV ─────────────────────────────── */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json() as {
    itens: { tipo: "produto" | "servico"; id: string; nome: string; preco: number; quantidade: number }[];
    descricao?: string;
  };

  if (!body.itens?.length) {
    return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });
  }

  const total = body.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
  if (total <= 0) {
    return NextResponse.json({ error: "Total inválido" }, { status: 400 });
  }

  const txid = generateEfiTxid("PDV");
  const descricao = body.descricao || `PDV — ${body.itens.length} item(ns)`;

  const result = await efiCreatePix({ txid, valor: total.toFixed(2), descricao });

  // Salva a venda no banco para tracking
  await prisma.transacao.create({
    data: {
      salonId: salonId!,
      tipo: "RECEITA",
      categoria: "Venda PDV",
      descricao: `PIX ${result.txid} — ${descricao}`,
      valor: String(total),
      metodo: "PIX",
      dataTransacao: new Date(),
    },
  });

  return NextResponse.json({
    txid: result.txid,
    brCode: result.brCode,
    qrCodeImage: result.qrCodeImage,
    total,
    mockMode: isMockMode(),
  });
}

/* ── GET: polling de status da cobrança ──────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const txid = req.nextUrl.searchParams.get("txid");
  if (!txid) return NextResponse.json({ error: "txid obrigatório" }, { status: 400 });

  const status = await efiGetPixStatus(txid);
  return NextResponse.json(status);
}
