import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { redis, CK, TTL, invalidateCache } from "@/lib/redis";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().optional(),
  bio: z.string().optional(),
  specialties: z.array(z.string()).default([]),
  comissao: z.number().min(0).max(1).default(0.4),
  password: z.string().min(6).default("123456"),
  servicoIds: z.array(z.string()).default([]),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "BARBER", "CLIENT"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const cacheKey = CK.COLABORADORES(salonId!);
  const useCache = !!process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://");
  if (useCache) {
    const cached = await redis.get(cacheKey);
    if (cached && Array.isArray(cached) && (cached as unknown[]).length > 0)
      return NextResponse.json(cached);
  }

  const colaboradores = await prisma.colaborador.findMany({
    where: { salonId: salonId!, active: true },
    include: {
      user: { select: { name: true, email: true, phone: true, image: true } },
      horarios: true,
      servicosOffer: { include: { servico: true } },
    },
    orderBy: { user: { name: "asc" } },
  });

  if (useCache) await redis.set(cacheKey, colaboradores, { ex: TTL.COLABORADORES });

  return NextResponse.json(colaboradores);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { name, email, phone, bio, specialties, comissao, password, servicoIds } =
    parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email já cadastrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const colaborador = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: { name, email: email.toLowerCase(), phone, passwordHash, role: "BARBER" },
    });

    const collab = await tx.colaborador.create({
      data: { userId: user.id, salonId: salonId!, bio, specialties, comissao },
    });

    // Default work hours Mon-Sat
    await tx.horarioColaborador.createMany({
      data: [1, 2, 3, 4, 5, 6].map((day) => ({
        colaboradorId: collab.id,
        diaSemana: day,
        inicio: "09:00",
        fim: "18:00",
      })),
    });

    if (servicoIds.length > 0) {
      await tx.colaboradorServico.createMany({
        data: servicoIds.map((servicoId) => ({ colaboradorId: collab.id, servicoId })),
      });
    }

    await tx.notifConfig.create({ data: { userId: user.id } });

    return collab;
  });

  await invalidateCache(CK.COLABORADORES(salonId!));

  return NextResponse.json(colaborador, { status: 201 });
}
