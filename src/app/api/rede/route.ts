import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

const createSchema = z.object({
  nome: z.string().min(2),
  logoUrl: z.string().url().optional(),
  salonIds: z.array(z.string()).optional(),
});

export async function GET(_req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const redes = await prisma.rede.findMany({
    where: { ownerId: session!.user.id, ativo: true },
    include: {
      salons: {
        select: { id: true, name: true, city: true, logoUrl: true, active: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(redes);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });
  }

  const { salonIds, ...data } = parsed.data;

  const rede = await prisma.rede.create({
    data: {
      ...data,
      ownerId: session!.user.id,
      ...(salonIds?.length
        ? { salons: { connect: salonIds.map((id) => ({ id })) } }
        : {}),
    },
    include: { salons: { select: { id: true, name: true, city: true } } },
  });

  return NextResponse.json(rede, { status: 201 });
}
