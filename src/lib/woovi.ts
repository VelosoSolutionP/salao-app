/**
 * Woovi (OpenPix) — cliente PIX
 * Docs: https://developers.woovi.com/api
 */

const BASE = "https://api.woovi.com/api/v1";

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: process.env.WOOVI_APP_ID ?? "",
  };
}

export interface WooviChargeResult {
  correlationID: string;
  brCode: string;
  qrCodeImage: string;
  status: string;
  paymentLinkUrl?: string;
}

/** Cria uma cobrança PIX */
export async function wooviCreateCharge(params: {
  correlationID: string;
  value: number; // em centavos
  comment?: string;
}): Promise<WooviChargeResult> {
  const res = await fetch(`${BASE}/charge`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      correlationID: params.correlationID,
      value: params.value,
      comment: params.comment ?? "Pagamento atendimento",
      expiresIn: 3600, // 1 hora
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Woovi ${res.status}: ${body}`);
  }

  const data = await res.json();
  const c = data.charge;

  return {
    correlationID: c.correlationID,
    brCode: c.brCode,
    qrCodeImage: c.qrCodeImage ?? "",
    status: c.status,
    paymentLinkUrl: c.paymentLinkUrl,
  };
}

/** Consulta status de uma cobrança */
export async function wooviGetCharge(correlationID: string): Promise<{ status: string }> {
  const res = await fetch(`${BASE}/charge?correlationID=${encodeURIComponent(correlationID)}`, {
    headers: authHeaders(),
    cache: "no-store",
  });

  if (!res.ok) throw new Error("Woovi: erro ao consultar cobrança");

  const data = await res.json();
  return { status: (data.charge?.status as string) ?? "UNKNOWN" };
}
