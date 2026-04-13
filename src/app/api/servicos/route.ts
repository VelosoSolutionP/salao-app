export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { redis, CK, TTL, invalidateCache } from "@/lib/redis";

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  preco: z.number().positive(),
  duracao: z.number().int().positive(),
  categoria: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "BARBER", "CLIENT"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const cacheKey = CK.SERVICOS(salonId!);
  const useCache = !!process.env.UPSTASH_REDIS_REST_URL?.startsWith("https://");
  if (useCache) {
    const cached = await redis.get(cacheKey);
    if (cached && Array.isArray(cached) && (cached as unknown[]).length > 0)
      return NextResponse.json(cached);
  }

  const servicos = await prisma.servico.findMany({
    where: { salonId: salonId!, ativo: true },
    orderBy: { nome: "asc" },
  });

  if (useCache) await redis.set(cacheKey, servicos, { ex: TTL.SERVICOS });

  return NextResponse.json(servicos);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const servico = await prisma.servico.create({
    data: { salonId: salonId!, ...parsed.data },
  });

  await invalidateCache(CK.SERVICOS(salonId!));

  return NextResponse.json(servico, { status: 201 });
}
