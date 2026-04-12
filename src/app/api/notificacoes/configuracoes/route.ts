import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

const updateSchema = z.object({
  emailAtivo: z.boolean().optional(),
  whatsappAtivo: z.boolean().optional(),
  pushAtivo: z.boolean().optional(),
  pushSubscription: z.record(z.string(), z.unknown()).optional().nullable(),
  lembrete1h: z.boolean().optional(),
  lembrete24h: z.boolean().optional(),
  lembreteConfirm: z.boolean().optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const config = await prisma.notifConfig.findUnique({
    where: { userId: session!.user.id },
  });

  if (!config) {
    return NextResponse.json({ error: "Configuração não encontrada" }, { status: 404 });
  }

  return NextResponse.json(config);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { pushSubscription, ...rest } = parsed.data;
  const pushSub =
    pushSubscription === null
      ? Prisma.JsonNull
      : (pushSubscription as Prisma.InputJsonValue | undefined);

  const config = await prisma.notifConfig.upsert({
    where: { userId: session!.user.id },
    update: { ...rest, ...(pushSub !== undefined && { pushSubscription: pushSub }) },
    create: { userId: session!.user.id, ...rest, ...(pushSub !== undefined && { pushSubscription: pushSub }) },
  });

  return NextResponse.json(config);
}
