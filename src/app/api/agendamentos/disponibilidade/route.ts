import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { redis, CK, TTL } from "@/lib/redis";

const useCache = !!process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://");
import { addMinutes, parseISO, format, isWithinInterval } from "date-fns";

export async function GET(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { searchParams } = req.nextUrl;
  const colaboradorId = searchParams.get("colaboradorId");
  const date = searchParams.get("date"); // YYYY-MM-DD
  const duracaoTotal = parseInt(searchParams.get("duracao") ?? "30");

  if (!colaboradorId || !date) {
    return NextResponse.json(
      { error: "colaboradorId e date são obrigatórios" },
      { status: 400 }
    );
  }

  const cacheKey = CK.SLOTS(colaboradorId, date);
  if (useCache) {
    const cached = await redis.get(cacheKey);
    if (cached) return NextResponse.json(cached);
  }

  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  const [horario, bloqueios, agendamentosExistentes] = await Promise.all([
    prisma.horarioColaborador.findFirst({
      where: { colaboradorId, diaSemana: dayOfWeek, ativo: true },
    }),
    prisma.bloqueioAgenda.findMany({
      where: {
        colaboradorId,
        inicio: { lte: new Date(date + "T23:59:59") },
        fim: { gte: new Date(date + "T00:00:00") },
      },
    }),
    prisma.agendamento.findMany({
      where: {
        colaboradorId,
        inicio: { gte: new Date(date + "T00:00:00") },
        fim: { lte: new Date(date + "T23:59:59") },
        status: { notIn: ["CANCELADO", "NAO_COMPARECEU"] },
      },
    }),
  ]);

  if (!horario) {
    return NextResponse.json({ slots: [], message: "Dia não disponível" });
  }

  const [startH, startM] = horario.inicio.split(":").map(Number);
  const [endH, endM] = horario.fim.split(":").map(Number);

  const dayStart = new Date(`${date}T${String(startH).padStart(2, "0")}:${String(startM).padStart(2, "0")}:00`);
  const dayEnd = new Date(`${date}T${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}:00`);

  const slots: { time: string; available: boolean }[] = [];
  let current = dayStart;

  while (addMinutes(current, duracaoTotal) <= dayEnd) {
    const slotEnd = addMinutes(current, duracaoTotal);
    const timeStr = format(current, "HH:mm");

    const blockedByBloqueio = bloqueios.some((b) =>
      isWithinInterval(current, { start: b.inicio, end: b.fim }) ||
      isWithinInterval(slotEnd, { start: b.inicio, end: b.fim })
    );

    const blockedByAgendamento = agendamentosExistentes.some(
      (a) =>
        current < a.fim && slotEnd > a.inicio
    );

    slots.push({
      time: timeStr,
      available: !blockedByBloqueio && !blockedByAgendamento,
    });

    current = addMinutes(current, 30); // 30min intervals
  }

  const result = { slots };
  if (useCache) await redis.set(cacheKey, result, { ex: TTL.SLOTS });

  return NextResponse.json(result);
}
