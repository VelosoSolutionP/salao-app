import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendPush } from "@/lib/push";

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

      // Push notification para o cliente
      if (agendamento.cliente?.userId) {
        const hora = format(agendamento.inicio, "HH:mm", { locale: ptBR });
        const dia = format(agendamento.inicio, "EEEE", { locale: ptBR });
        await sendPush(agendamento.cliente.userId, {
          title: "📅 Lembrete de agendamento",
          body: `Seu horário é ${dia === format(new Date(), "EEEE", { locale: ptBR }) ? "hoje" : "amanhã"} às ${hora} em ${agendamento.salon.name}`,
          url: "/agendar",
        });
      }

      // Push para o barbeiro/colaborador
      if (agendamento.colaborador?.userId) {
        const hora = format(agendamento.inicio, "HH:mm", { locale: ptBR });
        const clienteNome = agendamento.cliente?.user?.name ?? "Cliente";
        await sendPush(agendamento.colaborador.userId, {
          title: "✂️ Agendamento amanhã",
          body: `${clienteNome} às ${hora}`,
          url: "/agenda",
        });
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

      // Push 1h antes — só para o cliente
      if (agendamento.cliente?.userId) {
        const hora = format(agendamento.inicio, "HH:mm", { locale: ptBR });
        await sendPush(agendamento.cliente.userId, {
          title: "⏰ Seu horário é em 1 hora!",
          body: `${hora} em ${agendamento.salon.name} — não se esqueça!`,
          url: "/agendar",
        });
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
