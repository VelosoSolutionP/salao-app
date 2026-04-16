/**
 * POST /api/pagamentos/setup-plano
 *
 * Cria um Customer Stripe (se não existir) e uma Checkout Session no modo
 * "setup" para salvar o cartão do cliente sem cobrança imediata.
 * Ao concluir, o webhook checkout.session.completed salva o PaymentMethod.
 *
 * Body: { clientePlanoId: string }
 * Response: { url: string }  — redirecionar o cliente para esta URL
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { clientePlanoId } = await req.json();
  if (!clientePlanoId) {
    return NextResponse.json({ error: "clientePlanoId obrigatório" }, { status: 400 });
  }

  const cp = await prisma.clientePlano.findUnique({
    where: { id: clientePlanoId },
    include: {
      cliente: { include: { user: { select: { id: true, name: true, email: true, stripeCustomerId: true } } } },
      plano: { select: { nome: true, valor: true } },
    },
  });

  if (!cp) {
    return NextResponse.json({ error: "ClientePlano não encontrado" }, { status: 404 });
  }

  const clienteUser = cp.cliente.user;

  // 1. Cria Customer no Stripe se não existir
  let stripeCustomerId = clienteUser.stripeCustomerId;
  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      name: clienteUser.name,
      email: clienteUser.email,
      metadata: { userId: clienteUser.id, clienteId: cp.clienteId },
    });
    stripeCustomerId = customer.id;
    await prisma.user.update({
      where: { id: clienteUser.id },
      data: { stripeCustomerId },
    });
  }

  // 2. Checkout Session em modo setup
  const checkoutSession = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: stripeCustomerId,
    payment_method_types: ["card"],
    success_url: `${APP_URL}/planos/sucesso?session_id={CHECKOUT_SESSION_ID}&plano_id=${clientePlanoId}`,
    cancel_url: `${APP_URL}/clientes`,
    metadata: {
      clientePlanoId,
      clienteId: cp.clienteId,
      salonId: cp.salonId,
    },
    locale: "pt-BR",
    custom_text: {
      submit: { message: `Salvar cartão para o plano "${cp.plano.nome}"` },
    },
  });

  return NextResponse.json({ url: checkoutSession.url });
}
