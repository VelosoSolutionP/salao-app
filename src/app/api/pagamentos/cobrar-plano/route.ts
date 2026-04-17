/**
 * POST /api/pagamentos/cobrar-plano
 *
 * Cobra o plano mensal de um cliente usando o cartão salvo.
 * Chamado manualmente pelo OWNER ou automaticamente via cron no 1º dia do mês.
 *
 * Body: { clientePlanoId: string }
 * Response: { ok: true; paymentIntentId: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getStripe, toCents } from "@/lib/stripe";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const role = (session.user as { role: string }).role;
  if (role !== "OWNER" && role !== "MASTER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const { clientePlanoId } = await req.json();
  if (!clientePlanoId) {
    return NextResponse.json({ error: "clientePlanoId obrigatório" }, { status: 400 });
  }

  const cp = await prisma.clientePlano.findUnique({
    where: { id: clientePlanoId },
    include: {
      plano: { select: { nome: true, valor: true } },
      cliente: { include: { user: { select: { stripeCustomerId: true } } } },
    },
  });

  if (!cp) return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 });
  if (!cp.ativo) return NextResponse.json({ error: "Plano inativo" }, { status: 400 });
  if (!cp.stripePaymentMethodId) {
    return NextResponse.json({ error: "Cartão não cadastrado. Solicite ao cliente salvar o cartão primeiro." }, { status: 400 });
  }

  const stripeCustomerId = cp.cliente.user.stripeCustomerId;
  if (!stripeCustomerId) {
    return NextResponse.json({ error: "Cliente sem Customer ID no Stripe" }, { status: 400 });
  }

  const amount = toCents(cp.plano.valor);

  // Cobra fora da sessão (off_session = sem presença do cliente)
  const stripe = getStripe();
  const pi = await stripe.paymentIntents.create({
    amount,
    currency: "brl",
    customer: stripeCustomerId,
    payment_method: cp.stripePaymentMethodId,
    confirm: true,
    off_session: true,
    description: `Plano mensal: ${cp.plano.nome}`,
    metadata: {
      clientePlanoId: cp.id,
      clienteId: cp.clienteId,
      salonId: cp.salonId,
    },
  });

  // Atualiza datas de pagamento
  const agora = new Date();
  const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);

  await prisma.clientePlano.update({
    where: { id: cp.id },
    data: {
      ultimoPagamento: agora,
      proximoVencimento: proximoMes,
      pagamentoStatus: pi.status === "succeeded" ? "PAGO" : "PENDENTE",
    },
  });

  return NextResponse.json({ ok: true, paymentIntentId: pi.id, status: pi.status });
}
