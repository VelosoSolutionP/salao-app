export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSalon } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { getPlano } from "@/lib/planos";
import { generateEfiTxid, buildFallbackBrCode, generateQrImage } from "@/lib/efi";

type Item = { tipo: "produto" | "servico"; id: string; nome: string; preco: number; quantidade: number };
type MetodoPagamento = "PIX" | "DINHEIRO" | "CARTAO_DEBITO" | "CARTAO_CREDITO";

/* ── POST: criar venda PDV ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId! },
    select: { contratos: { where: { ativo: true }, select: { plano: true }, orderBy: { createdAt: "desc" }, take: 1 } },
  });
  const plano = getPlano(salon?.contratos[0]?.plano);
  if (!plano.routes.includes("/pdv")) {
    return NextResponse.json({ error: "PDV disponível a partir do plano Prata." }, { status: 403 });
  }

  const body = await req.json() as {
    itens: Item[];
    metodo?: MetodoPagamento;
    descricao?: string;
  };

  if (!body.itens?.length) return NextResponse.json({ error: "Carrinho vazio" }, { status: 400 });

  const total = body.itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
  if (total <= 0) return NextResponse.json({ error: "Total inválido" }, { status: 400 });

  const metodo: MetodoPagamento = body.metodo ?? "PIX";
  const descricao = body.descricao || `PDV — ${body.itens.length} item(ns)`;

  /* ── PIX: gera QR code via Inter direto ────────────────────────────────── */
  if (metodo === "PIX") {
    const INTER_KEY = "8ab74c98-5042-4c52-9578-41e10b85cad1";
    const txid = generateEfiTxid("PDV");

    const salon = await prisma.salon.findUnique({
      where: { id: salonId! },
      select: { pixKey: true, name: true },
    });
    const pixKey = salon?.pixKey || process.env.EFI_PIX_KEY || INTER_KEY;

    const brCode = buildFallbackBrCode(txid, total.toFixed(2), pixKey, salon?.name ?? undefined);
    const qrCodeImage = await generateQrImage(brCode);

    await prisma.transacao.create({
      data: {
        salonId: salonId!,
        tipo: "RECEITA",
        categoria: "Venda PDV",
        descricao: `PIX ${txid} — ${descricao}`,
        valor: String(total),
        metodo: "PIX",
        dataTransacao: new Date(),
      },
    });

    return NextResponse.json({
      metodo: "PIX",
      txid,
      brCode,
      qrCodeImage,
      total,
      mockMode: true,
    });
  }

  /* ── Outros métodos: registra direto como pago ──────────────────────────── */
  await prisma.transacao.create({
    data: {
      salonId: salonId!,
      tipo: "RECEITA",
      categoria: "Venda PDV",
      descricao: `${metodo} — ${descricao}`,
      valor: String(total),
      metodo,
      dataTransacao: new Date(),
    },
  });

  return NextResponse.json({ metodo, total, pago: true });
}

/* ── GET: polling de status PIX ─────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  void req;
  // PDV usa confirmação manual — polling sempre retorna ATIVA
  return NextResponse.json({ status: "ATIVA" });
}
