export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

const switchSchema = z.object({ salonId: z.string() });

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const body = await req.json();
  const parsed = switchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "salonId inválido" }, { status: 400 });
  }

  // Verify the caller actually owns this salon
  const salon = await prisma.salon.findFirst({
    where: { id: parsed.data.salonId, ownerId: session!.user.id },
  });

  if (!salon) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const response = NextResponse.json({ ok: true, salonId: salon.id, name: salon.name });
  response.cookies.set("active_salon_id", salon.id, {
    httpOnly: false, // JS-readable so the switcher can show the active salon
    path: "/",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    sameSite: "lax",
  });

  return response;
}
