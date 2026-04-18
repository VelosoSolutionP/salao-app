import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { addHours, addMinutes, format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { sendPush } from "@/lib/push";
import { sendWhatsApp, msgLembrete24h, msgLembrete1h, msgVencimentoProximo } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const results = { sent24h: 0, sentLembrete: 0, sentContrato: 0 };

  // ── 24h reminder (fixed, universal) ──────────────────────────────────────
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
    take: 100,
  });

  for (const ag of lembrete24h) {
    try {
      const hora = format(ag.inicio, "HH:mm", { locale: ptBR });
      const clienteNome = ag.cliente?.user?.name ?? "Cliente";
      const clientePhone = ag.cliente?.user?.phone;

      if (ag.cliente?.userId) {
        await sendPush(ag.cliente.userId, {
          title: "📅 Lembrete de agendamento",
          body: `Seu horário é amanhã às ${hora} em ${ag.salon.name}`,
          url: "/agendar",
        });
      }

      if (clientePhone) {
        const servicos = ag.servicos.map((s) => s.servico.nome).join(", ");
        sendWhatsApp(clientePhone, msgLembrete24h(clienteNome, ag.salon.name, hora, servicos)).catch(() => {});
      }

      if (ag.colaborador?.userId) {
        await sendPush(ag.colaborador.userId, {
          title: "✂️ Agendamento amanhã",
          body: `${clienteNome} às ${hora}`,
          url: "/agenda",
        });
      }

      await prisma.agendamento.update({ where: { id: ag.id }, data: { lembrete24hEnviado: true } });
      results.sent24h++;
    } catch (e) {
      console.error(`Failed 24h reminder ${ag.id}:`, e);
    }
  }

  // ── Short-term reminder (per-salon configurable timing) ───────────────────
  // Load salons with their custom timing
  const salons = await prisma.salon.findMany({
    where: { active: true },
    select: { id: true, name: true, lembreteAntecedenciaMinutos: true },
  });

  for (const salon of salons) {
    const minutos = salon.lembreteAntecedenciaMinutos ?? 60;
    // Window: ±15 minutes around the target time
    const targetFrom = addMinutes(now, minutos - 15);
    const targetTo   = addMinutes(now, minutos + 15);

    const agendamentos = await prisma.agendamento.findMany({
      where: {
        salonId: salon.id,
        inicio: { gte: targetFrom, lte: targetTo },
        status: { in: ["PENDENTE", "CONFIRMADO"] },
        lembrete1hEnviado: false,
      },
      include: {
        cliente: { include: { user: true } },
        salon: true,
      },
      take: 50,
    });

    for (const ag of agendamentos) {
      try {
        const hora = format(ag.inicio, "HH:mm", { locale: ptBR });
        const clienteNome = ag.cliente?.user?.name ?? "Cliente";
        const clientePhone = ag.cliente?.user?.phone;

        if (ag.cliente?.userId) {
          await sendPush(ag.cliente.userId, {
            title: `⏰ Seu horário é em ${minutos < 60 ? `${minutos} min` : `${Math.round(minutos / 60)}h`}!`,
            body: `${hora} em ${ag.salon.name} — não se esqueça!`,
            url: "/agendar",
          });
        }

        if (clientePhone) {
          sendWhatsApp(clientePhone, msgLembrete1h(clienteNome, ag.salon.name, hora, minutos)).catch(() => {});
        }

        await prisma.agendamento.update({ where: { id: ag.id }, data: { lembrete1hEnviado: true } });
        results.sentLembrete++;
      } catch (e) {
        console.error(`Failed short-term reminder ${ag.id}:`, e);
      }
    }
  }

  // ── Contract expiry: warn owner 5 days before ─────────────────────────────
  const in5days = addDays(now, 5);
  const vencimentosProximos = await prisma.pagamentoContrato.findMany({
    where: {
      vencimento: { gte: startOfDay(in5days), lte: endOfDay(in5days) },
      pago: false,
      notificado: false,
    },
    include: {
      contrato: {
        include: {
          salon: {
            include: { owner: { select: { phone: true, name: true } } },
          },
        },
      },
    },
    take: 50,
  });

  for (const pag of vencimentosProximos) {
    try {
      const salon = pag.contrato.salon;
      const ownerPhone = salon.owner?.phone;
      const valor = Number(pag.valor).toFixed(2).replace(".", ",");

      if (ownerPhone) {
        await sendWhatsApp(ownerPhone, msgVencimentoProximo(salon.name, 5, valor));
      }

      await prisma.pagamentoContrato.update({
        where: { id: pag.id },
        data: { notificado: true },
      });
      results.sentContrato++;
    } catch (e) {
      console.error(`Failed contract reminder ${pag.id}:`, e);
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
