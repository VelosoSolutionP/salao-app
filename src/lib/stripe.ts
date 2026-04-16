import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY não configurada");
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apiVersion: "2025-06-30.basil" as any,
  typescript: true,
});

/** Converte Decimal/number do Prisma para centavos (inteiro) */
export function toCents(valor: number | string | { toNumber(): number }): number {
  const n = typeof valor === "object" ? valor.toNumber() : Number(valor);
  return Math.round(n * 100);
}
