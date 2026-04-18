export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { sendWhatsApp } from "@/lib/whatsapp";

export async function POST() {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const salon = await prisma.salon.findFirst({
    where: session!.user.salonId
      ? { id: session!.user.salonId }
      : { ownerId: session!.user.id },
    include: { owner: { select: { phone: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (!salon) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const phone = salon.owner?.phone;
  if (!phone) {
    return NextResponse.json({ error: "Telefone do proprietário não cadastrado" }, { status: 400 });
  }

  const msg =
    `✅ *Teste de alerta Bellefy*\n\nOlá! Esta é uma mensagem de teste do sistema de alertas WhatsApp do salão *${salon.name}*.\n\nSe você recebeu esta mensagem, os alertas estão funcionando corretamente! 🎉\n\n_Bellefy — Controle Total de Salões_`;

  const ok = await sendWhatsApp(phone, msg);

  if (!ok) {
    return NextResponse.json({ error: "Falha ao enviar mensagem. Verifique as configurações do Z-API." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phone });
}
