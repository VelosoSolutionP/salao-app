/**
 * POST /api/pagamentos/intencao
 *
 * Cria um PaymentIntent Stripe para cobrar um atendimento no balcão.
 * Suporta PIX e cartão (crédito/débito) conforme habilitado no dashboard Stripe.
 *
 * Body: { agendamentoId: string }
 * Response: { clientSecret: string; amount: number; currency: string }
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

  const { agendamentoId } = await req.json();
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

  const amount = toCents(ag.totalPrice);
  if (amount < 50) {
    return NextResponse.json({ error: "Valor mínimo R$0,50" }, { status: 400 });
  }

  const stripe = getStripe();

  // Cria ou reutiliza PaymentIntent existente
  if (ag.stripePaymentIntentId) {
    try {
      const existing = await stripe.paymentIntents.retrieve(ag.stripePaymentIntentId);
      if (existing.status === "requires_payment_method" || existing.status === "requires_confirmation") {
        return NextResponse.json({
          clientSecret: existing.client_secret,
          amount: existing.amount,
          currency: existing.currency,
        });
      }
    } catch {
      // cria novo se o antigo não for válido
    }
  }

  const pi = await stripe.paymentIntents.create({
    amount,
    currency: "brl",
    payment_method_types: ["card", "pix"],
    metadata: {
      agendamentoId: ag.id,
      salonId: ag.salonId,
      salonNome: ag.salon.name,
    },
    description: `Atendimento — ${ag.salon.name}`,
  });

  // Armazena o PaymentIntent ID no agendamento
  await prisma.agendamento.update({
    where: { id: ag.id },
    data: { stripePaymentIntentId: pi.id },
  });

  return NextResponse.json({
    clientSecret: pi.client_secret,
    amount: pi.amount,
    currency: pi.currency,
  });
}
