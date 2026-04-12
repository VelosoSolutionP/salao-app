import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours } from "date-fns";

// Vercel Cron: runs every 30 minutes
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/lembretes", "schedule": "*/30 * * * *" }] }
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find appointments needing 24h reminder
  const lembrete24h = await prisma.agendamento.findMany({
    where: {
      inicio: {
        gte: addHours(now, 23),
        lte: addHours(now, 25),
      },
      status: { in: ["PENDENTE", "CONFIRMADO"] },
      lembrete24hEnviado: false,
    },
    include: {
      cliente: { include: { user: true } },
      colaborador: { include: { user: true } },
      salon: true,
    },
    take: 50,
  });

  // Find appointments needing 1h reminder
  const lembrete1h = await prisma.agendamento.findMany({
    where: {
      inicio: {
        gte: addHours(now, 0.75),
        lte: addHours(now, 1.25),
      },
      status: { in: ["PENDENTE", "CONFIRMADO"] },
      lembrete1hEnviado: false,
    },
    include: {
      cliente: { include: { user: true } },
      colaborador: { include: { user: true } },
      salon: true,
    },
    take: 50,
  });

  const results = { sent24h: 0, sent1h: 0 };

  // Process 24h reminders
  for (const agendamento of lembrete24h) {
    try {
      const notifConfig = agendamento.cliente ? await prisma.notifConfig.findUnique({
        where: { userId: agendamento.cliente.userId },
      }) : null;

      if (notifConfig?.lembrete24h && notifConfig.emailAtivo) {
        // Send email reminder (Resend)
        // await sendReminderEmail(agendamento, "24h");
      }

      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { lembrete24hEnviado: true },
      });

      results.sent24h++;
    } catch (e) {
      console.error(`Failed to send 24h reminder for ${agendamento.id}:`, e);
    }
  }

  // Process 1h reminders
  for (const agendamento of lembrete1h) {
    try {
      const notifConfig = agendamento.cliente ? await prisma.notifConfig.findUnique({
        where: { userId: agendamento.cliente.userId },
      }) : null;

      if (notifConfig?.lembrete1h && notifConfig.emailAtivo) {
        // await sendReminderEmail(agendamento, "1h");
      }

      await prisma.agendamento.update({
        where: { id: agendamento.id },
        data: { lembrete1hEnviado: true },
      });

      results.sent1h++;
    } catch (e) {
      console.error(`Failed to send 1h reminder for ${agendamento.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
