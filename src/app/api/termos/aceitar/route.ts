export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  if (session.user.role !== "OWNER") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const salonId = session.user.salonId;
  if (!salonId) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    req.headers.get("x-real-ip") ??
    "desconhecido";

  await prisma.salon.update({
    where: { id: salonId },
    data: {
      termoAceito: true,
      termoAceitoEm: new Date(),
      termoAceitoIp: ip,
    },
  });

  return NextResponse.json({ ok: true });
}
