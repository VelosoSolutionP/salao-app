export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { MercadoPagoConfig, Preference } from "mercadopago";

export async function GET() {
  const { error } = await requireRole(["MASTER"]);
  if (error) return error;

  const token = process.env.MP_ACCESS_TOKEN?.trim();
  if (!token) {
    return NextResponse.json({ error: "MP_ACCESS_TOKEN não configurado" }, { status: 500 });
  }

  try {
    const client = new MercadoPagoConfig({ accessToken: token });
    const preference = new Preference(client);

    const result = await preference.create({
      body: {
        items: [{ id: "teste-1", title: "Teste TOQE — R$1", quantity: 1, unit_price: 1, currency_id: "BRL" }],
        external_reference: "teste-manual",
      },
    });

    return NextResponse.json({ link: result.init_point });
  } catch (err: any) {
    console.error("Teste MP erro:", err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 500 });
  }
}
