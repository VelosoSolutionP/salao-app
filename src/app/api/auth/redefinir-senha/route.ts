import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const schema = z.object({
  token:    z.string().min(64).max(64),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

const resetKey = (token: string) => `reset:${token}`;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: zodMsg(parsed.error) },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;

  // ── Validate token ──────────────────────────────────────────
  const userId = await redis.get(resetKey(token));
  if (!userId) {
    return NextResponse.json(
      { error: "Link inválido ou expirado. Solicite um novo link de redefinição." },
      { status: 400 }
    );
  }

  // ── Find user ───────────────────────────────────────────────
  const user = await prisma.user.findUnique({
    where: { id: userId as string },
    select: { id: true, active: true },
  });

  if (!user || !user.active) {
    await redis.del(resetKey(token));
    return NextResponse.json({ error: "Conta não encontrada ou inativa." }, { status: 404 });
  }

  // ── Hash new password (bcrypt rounds=12) ────────────────────
  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  // ── Consume token (one-time use) ────────────────────────────
  await redis.del(resetKey(token));

  return NextResponse.json({ message: "Senha redefinida com sucesso. Faça login com sua nova senha." });
}

// Validate token without consuming it (GET)
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get("token");
  if (!token || token.length !== 64) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }
  const userId = await redis.get(resetKey(token));
  return NextResponse.json({ valid: !!userId });
}
