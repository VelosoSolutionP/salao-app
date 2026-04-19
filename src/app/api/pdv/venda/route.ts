export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requireSalon } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { efiCreatePix, efiGetPixStatus, generateEfiTxid, isMockMode, buildFallbackBrCode, generateQrImage } from "@/lib/efi";

type Item = { tipo: "produto" | "servico"; id: string; nome: string; preco: number; quantidade: number };
type MetodoPagamento = "PIX" | "DINHEIRO" | "CARTAO_DEBITO" | "CARTAO_CREDITO";

/* ── POST: criar venda PDV ───────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

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

  /* ── PIX: gera QR code ─────────────────────────────────────────────────── */
  if (metodo === "PIX") {
    const txid = generateEfiTxid("PDV");
    let result;
    let forcedMock = false;

    // Busca chave PIX cadastrada nas configurações do salão
    const salon = await prisma.salon.findUnique({
      where: { id: salonId! },
      select: { pixKey: true },
    });
    const salonPixKey = salon?.pixKey ?? undefined;

    // Se salão tem chave própria, gera QR direto (sem Efí)
    if (salonPixKey) {
      const brCode = buildFallbackBrCode(txid, total.toFixed(2), salonPixKey);
      result = {
        txid,
        brCode,
        qrCodeImage: await generateQrImage(brCode),
        status: "ATIVA",
        mockMode: true,
      };
    } else {
      try {
        result = await efiCreatePix({ txid, valor: total.toFixed(2), descricao });
      } catch (err) {
        console.error("[PDV] Efi API falhou, usando simulação:", err);
        forcedMock = true;
        const brCode = buildFallbackBrCode(txid, total.toFixed(2));
        result = {
          txid,
          brCode,
          qrCodeImage: await generateQrImage(brCode),
          status: "ATIVA",
          mockMode: true,
        };
      }
    }

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
      metodo: "PIX",
      txid: result.txid,
      brCode: result.brCode,
      qrCodeImage: result.qrCodeImage,
      total,
      mockMode: isMockMode() || forcedMock || result.mockMode,
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

  const txid = req.nextUrl.searchParams.get("txid");
  if (!txid) return NextResponse.json({ error: "txid obrigatório" }, { status: 400 });

  const status = await efiGetPixStatus(txid);
  return NextResponse.json(status);
}
