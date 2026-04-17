/**
 * POST /api/webhook/stripe
 *
 * Recebe eventos do Stripe e atualiza o banco conforme o tipo:
 *
 * checkout.session.completed (modo setup)
 *   → salva stripePaymentMethodId no ClientePlano
 *
 * payment_intent.succeeded
 *   → se agendamentoId no metadata: conclui agendamento + cria Transacao
 *   → se clientePlanoId no metadata: marca plano como PAGO
 *
 * payment_intent.payment_failed
 *   → registra falha no pagamento do plano
 */

import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig  = req.headers.get("stripe-signature") ?? "";
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!secret) {
    return NextResponse.json({ error: "STRIPE_WEBHOOK_SECRET não configurado" }, { status: 500 });
  }

  const stripe = getStripe();
  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Assinatura inválida";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  try {
    switch (event.type) {

      /* ── Cartão salvo para plano mensal ─────────────────────────────── */
      case "checkout.session.completed": {
        const session = event.data.object as {
          mode: string;
          setup_intent: string | null;
          metadata: Record<string, string>;
        };

        if (session.mode !== "setup") break;

        const { clientePlanoId } = session.metadata ?? {};
        if (!clientePlanoId || !session.setup_intent) break;

        const si = await stripe.setupIntents.retrieve(session.setup_intent as string);
        const paymentMethodId = typeof si.payment_method === "string"
          ? si.payment_method
          : si.payment_method?.id;

        if (paymentMethodId) {
          await prisma.clientePlano.update({
            where: { id: clientePlanoId },
            data: {
              stripeSetupIntentId:   session.setup_intent,
              stripePaymentMethodId: paymentMethodId,
            },
          });
        }
        break;
      }

      /* ── Pagamento de atendimento ou plano confirmado ───────────────── */
      case "payment_intent.succeeded": {
        const pi = event.data.object as {
          id: string;
          amount: number;
          metadata: Record<string, string>;
          payment_method_types: string[];
        };

        const { agendamentoId, clientePlanoId } = pi.metadata ?? {};

        // Pagamento de atendimento (balcão)
        if (agendamentoId) {
          const ag = await prisma.agendamento.findUnique({
            where: { id: agendamentoId },
            include: { colaborador: { select: { comissaoSalaoProduto: true, comissaoProprioProduto: true } } },
          });

          if (ag && ag.status !== "CONCLUIDO") {
            const metodo = pi.payment_method_types.includes("pix") ? "PIX" : "CARTAO_CREDITO";

            await prisma.$transaction(async (tx) => {
              await tx.agendamento.update({
                where: { id: agendamentoId },
                data: {
                  status: "CONCLUIDO",
                  pagamento: metodo,
                  pagamentoStatus: "PAGO",
                },
              });

              // Cria Transacao financeira
              await tx.transacao.create({
                data: {
                  salonId:      ag.salonId,
                  agendamentoId: ag.id,
                  tipo:          "RECEITA",
                  descricao:     "Atendimento concluído",
                  valor:         ag.totalPrice,
                  metodo,
                  dataTransacao: new Date(),
                },
              });

              // Cria comissão do colaborador
              const percentual = ag.usouProprioProduto
                ? Number(ag.colaborador?.comissaoProprioProduto ?? 0.50)
                : Number(ag.colaborador?.comissaoSalaoProduto ?? 0.40);
              const valorComissao = Number(ag.totalPrice) * percentual;

              await tx.comissaoColaborador.upsert({
                where: { agendamentoId: ag.id },
                create: {
                  salonId:       ag.salonId,
                  colaboradorId: ag.colaboradorId,
                  agendamentoId: ag.id,
                  valor:         valorComissao,
                  percentual,
                  tipoProduto:   ag.usouProprioProduto ? "PROPRIO" : "SALAO",
                  referencia:    new Date().toISOString().slice(0, 7),
                },
                update: {},
              });
            });
          }
        }

        // Pagamento de plano mensal
        if (clientePlanoId) {
          const agora = new Date();
          const proximoMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 1);
          await prisma.clientePlano.update({
            where: { id: clientePlanoId },
            data: {
              pagamentoStatus: "PAGO",
              ultimoPagamento: agora,
              proximoVencimento: proximoMes,
            },
          });
        }
        break;
      }

      /* ── Falha no pagamento do plano ────────────────────────────────── */
      case "payment_intent.payment_failed": {
        const pi = event.data.object as { metadata: Record<string, string> };
        const { clientePlanoId } = pi.metadata ?? {};
        if (clientePlanoId) {
          await prisma.clientePlano.update({
            where: { id: clientePlanoId },
            data: { pagamentoStatus: "PENDENTE" },
          });
        }
        break;
      }
    }
  } catch (err) {
    console.error("[stripe-webhook]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
