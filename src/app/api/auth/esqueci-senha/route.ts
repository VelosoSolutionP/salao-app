export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { redis } from "@/lib/redis";

const schema = z.object({
  email: z.string().email(),
});

// Redis key helpers
const resetKey   = (token: string) => `reset:${token}`;
const rlKey      = (email: string) => `rl:reset:${email.toLowerCase()}`;
const RESET_TTL  = 60 * 60;          // 1 hour
const RL_TTL     = 60 * 15;          // 15 minutes
const RL_LIMIT   = 3;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Email inválido" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  // ── Rate limiting ───────────────────────────────────────────
  const rl = await redis.get(rlKey(email));
  const rlCount = rl ? parseInt(rl as string, 10) : 0;
  if (rlCount >= RL_LIMIT) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
      { status: 429 }
    );
  }
  await redis.set(rlKey(email), String(rlCount + 1), { ex: RL_TTL });

  // ── Find user (NEVER reveal if email exists or not) ─────────
  const user = await prisma.user.findUnique({ where: { email } });

  // Always respond with 200 to prevent email enumeration
  const SUCCESS_MSG = "Se este email estiver cadastrado, você receberá um link de redefinição.";

  if (!user || !user.active) {
    return NextResponse.json({ message: SUCCESS_MSG });
  }

  // ── Generate secure token ───────────────────────────────────
  const token = randomBytes(32).toString("hex");
  await redis.set(resetKey(token), user.id, { ex: RESET_TTL });

  const appUrl  = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const resetUrl = `${appUrl}/redefinir-senha/${token}`;

  // ── Send email ──────────────────────────────────────────────
  if (
    process.env.RESEND_API_KEY &&
    process.env.RESEND_API_KEY !== "re_test_placeholder"
  ) {
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: process.env.RESEND_FROM ?? "noreply@velosolution.com.br",
        to: email,
        subject: "Redefinição de senha — TOQE",
        html: buildEmailHtml(user.name, resetUrl),
      });
    } catch (err) {
      console.error("[esqueci-senha] Resend error:", err);
      // Don't expose email errors to the user
    }
  } else {
    // DEV fallback: log to console
    console.log("\n══════════════════════════════════════════════════");
    console.log("  [DEV] Link de redefinição de senha:");
    console.log(" ", resetUrl);
    console.log("══════════════════════════════════════════════════\n");
  }

  return NextResponse.json({ message: SUCCESS_MSG });
}

function buildEmailHtml(name: string, resetUrl: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f4f3f8;font-family:system-ui,sans-serif">
  <div style="max-width:480px;margin:40px auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#0e0b1a,#1a1040);padding:32px 40px">
      <div style="display:flex;align-items:center;gap:10px">
        <div style="width:36px;height:36px;background:linear-gradient(135deg,#7c3aed,#4f46e5);border-radius:10px;display:flex;align-items:center;justify-content:center">
          <span style="color:white;font-size:18px">✂</span>
        </div>
        <div>
          <p style="margin:0;color:white;font-weight:900;font-size:15px">TOQE</p>
          <p style="margin:0;color:#7c3aed;font-size:10px;letter-spacing:.1em;text-transform:uppercase">Controle Total de Salões</p>
        </div>
      </div>
    </div>
    <!-- Body -->
    <div style="padding:36px 40px">
      <h2 style="margin:0 0 8px;font-size:22px;font-weight:900;color:#111">Redefinir senha</h2>
      <p style="margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6">
        Olá <strong>${name}</strong>, recebemos uma solicitação para redefinir a senha da sua conta.
        Clique no botão abaixo para criar uma nova senha:
      </p>
      <a href="${resetUrl}"
        style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:white;text-decoration:none;
               padding:14px 28px;border-radius:12px;font-weight:900;font-size:14px;
               box-shadow:0 4px 16px rgba(109,40,217,.35)">
        Redefinir minha senha
      </a>
      <p style="margin:24px 0 0;color:#9ca3af;font-size:12px;line-height:1.6">
        Este link é válido por <strong>1 hora</strong> e só pode ser usado uma vez.<br/>
        Se você não solicitou a redefinição, ignore este email — sua senha continua a mesma.
      </p>
    </div>
    <!-- Footer -->
    <div style="padding:20px 40px;border-top:1px solid #f3f4f6">
      <p style="margin:0;color:#d1d5db;font-size:11px;text-align:center">
        © ${new Date().getFullYear()} TOQE · Todos os direitos reservados
      </p>
    </div>
  </div>
</body>
</html>`;
}
