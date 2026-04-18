export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (session.user.role !== "OWNER") {
      return NextResponse.json({ error: "Acesso negado — apenas proprietários aceitam o contrato" }, { status: 403 });
    }

    // salonId pode estar null se o JWT foi criado antes do salão existir
    let salonId = session.user.salonId;

    if (!salonId) {
      // Tenta buscar o salão diretamente pelo userId
      const salon = await prisma.salon.findFirst({
        where: { ownerId: session.user.id },
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      salonId = salon?.id ?? null;
    }

    if (!salonId) {
      return NextResponse.json({ error: "Nenhum salão vinculado a esta conta" }, { status: 404 });
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
  } catch (err: any) {
    console.error("[termos/aceitar]", err);
    return NextResponse.json(
      { error: err?.message ?? "Erro interno ao registrar aceite" },
      { status: 500 }
    );
  }
}
