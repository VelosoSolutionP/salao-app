import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY não configurada");
  }
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      apiVersion: "2025-06-30.basil" as any,
      typescript: true,
    });
  }
  return _stripe;
}

/** Converte Decimal/number do Prisma para centavos (inteiro) */
export function toCents(valor: number | string | { toNumber(): number }): number {
  const n = typeof valor === "object" ? valor.toNumber() : Number(valor);
  return Math.round(n * 100);
}
