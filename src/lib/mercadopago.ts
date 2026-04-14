import { MercadoPagoConfig, Preference, Payment } from "mercadopago";

function getClient() {
  return new MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN!.trim(),
  });
}

export async function criarLinkPagamento({
  pagamentoId,
  salonName,
  valor,
  referencia,
}: {
  pagamentoId: string;
  salonName: string;
  valor: number;
  referencia: string; // "2025-04"
}) {
  const client = getClient();
  const preference = new Preference(client);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://salao-app-puce.vercel.app";

  const result = await preference.create({
    body: {
      items: [
        {
          id: pagamentoId,
          title: `Mensalidade ${salonName} — ${referencia}`,
          quantity: 1,
          unit_price: valor,
          currency_id: "BRL",
        },
      ],
      external_reference: pagamentoId,
      notification_url: `${appUrl}/api/webhook/mercadopago`,
      back_urls: {
        success: `${appUrl}/pagamento/sucesso`,
        failure: `${appUrl}/pagamento/erro`,
        pending: `${appUrl}/pagamento/pendente`,
      },
      auto_return: "approved",
      statement_descriptor: "VELOSO SOLUTION",
    },
  });

  return {
    preferenciaId: result.id!,
    link: result.init_point!,
  };
}

export async function consultarPagamento(mpPagamentoId: string) {
  const client = getClient();
  const payment = new Payment(client);
  return payment.get({ id: mpPagamentoId });
}
