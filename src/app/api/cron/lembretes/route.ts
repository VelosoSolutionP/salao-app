import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendPush } from "@/lib/push";
import { sendWhatsApp, msgLembrete24h, msgLembrete1h } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  const lembrete24h = await prisma.agendamento.findMany({
    where: {
      inicio: { gte: addHours(now, 23), lte: addHours(now, 25) },
      status: { in: ["PENDENTE", "CONFIRMADO"] },
      lembrete24hEnviado: false,
    },
    include: {
      cliente: { include: { user: true } },
      colaborador: { include: { user: true } },
      salon: true,
      servicos: { include: { servico: { select: { nome: true } } } },
    },
    take: 50,
  });

  const lembrete1h = await prisma.agendamento.findMany({
    where: {
      inicio: { gte: addHours(now, 0.75), lte: addHours(now, 1.25) },
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

  for (const ag of lembrete24h) {
    try {
      const hora = format(ag.inicio, "HH:mm", { locale: ptBR });
      const diaLabel = format(ag.inicio, "EEEE", { locale: ptBR });
      const clienteNome = ag.cliente?.user?.name ?? "Cliente";
      const clientePhone = ag.cliente?.user?.phone;

      // Push para o cliente
      if (ag.cliente?.userId) {
        await sendPush(ag.cliente.userId, {
          title: "📅 Lembrete de agendamento",
          body: `Seu horário é amanhã às ${hora} em ${ag.salon.name}`,
          url: "/agendar",
        });
      }

      // WhatsApp para o cliente
      if (clientePhone) {
        const servicos = ag.servicos.map((s) => s.servico.nome).join(", ");
        sendWhatsApp(clientePhone, msgLembrete24h(clienteNome, ag.salon.name, hora, servicos))
          .catch(() => {});
      }

      // Push para o profissional
      if (ag.colaborador?.userId) {
        await sendPush(ag.colaborador.userId, {
          title: "✂️ Agendamento amanhã",
          body: `${clienteNome} às ${hora}`,
          url: "/agenda",
        });
      }

      await prisma.agendamento.update({
        where: { id: ag.id },
        data: { lembrete24hEnviado: true },
      });

      results.sent24h++;
    } catch (e) {
      console.error(`Failed 24h reminder ${ag.id}:`, e);
    }
  }

  for (const ag of lembrete1h) {
    try {
      const hora = format(ag.inicio, "HH:mm", { locale: ptBR });
      const clienteNome = ag.cliente?.user?.name ?? "Cliente";
      const clientePhone = ag.cliente?.user?.phone;

      // Push para o cliente
      if (ag.cliente?.userId) {
        await sendPush(ag.cliente.userId, {
          title: "⏰ Seu horário é em 1 hora!",
          body: `${hora} em ${ag.salon.name} — não se esqueça!`,
          url: "/agendar",
        });
      }

      // WhatsApp para o cliente
      if (clientePhone) {
        sendWhatsApp(clientePhone, msgLembrete1h(clienteNome, ag.salon.name, hora))
          .catch(() => {});
      }

      await prisma.agendamento.update({
        where: { id: ag.id },
        data: { lembrete1hEnviado: true },
      });

      results.sent1h++;
    } catch (e) {
      console.error(`Failed 1h reminder ${ag.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
