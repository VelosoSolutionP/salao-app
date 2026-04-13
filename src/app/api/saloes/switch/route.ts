export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

const switchSchema = z.object({ salonId: z.string() });

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "salonId inválido" }, { status: 400 });
  }

  const role = session!.user.role;

  let salon;
  if (role === "MASTER") {
    // MASTER can switch to any salon
    salon = await prisma.salon.findUnique({
      where: { id: parsed.data.salonId },
    });
  } else if (role === "OWNER") {
    // OWNER can only switch to salons they own
    salon = await prisma.salon.findFirst({
      where: { id: parsed.data.salonId, ownerId: session!.user.id },
    });
  } else {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  if (!salon) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, salonId: salon.id, name: salon.name });
  response.cookies.set("active_salon_id", salon.id, {
    httpOnly: false,
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
    sameSite: "lax",
  });

  return response;
}
