import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";

const createSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  city: z.string().optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;

  const role = session!.user.role;

  if (role === "MASTER") {
    // MASTER sees all salons
    const salons = await prisma.salon.findMany({
      select: { id: true, name: true, slug: true, city: true, logoUrl: true, active: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(salons);
  }

  if (role === "OWNER") {
    const salons = await prisma.salon.findMany({
      where: { ownerId: session!.user.id },
      select: { id: true, name: true, slug: true, city: true, logoUrl: true, active: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(salons);
  }

  // BARBER / CLIENT — return the salon they belong to
  if (role === "BARBER") {
    const colab = await prisma.colaborador.findUnique({
      where: { userId: session!.user.id },
      include: { salon: { select: { id: true, name: true, slug: true, city: true, logoUrl: true, active: true } } },
    });
    return NextResponse.json(colab?.salon ? [colab.salon] : []);
  }

  return NextResponse.json([]);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  // Only MASTER can register new salons
  if (session!.user.role !== "MASTER") {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });
  }

  const base = parsed.data.name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const slug = `${base}-${Date.now()}`;

  const salon = await prisma.salon.create({
    data: {
      ownerId: session!.user.id, // master owns it until transferred
      name: parsed.data.name,
      city: parsed.data.city,
      slug,
    },
  });

  return NextResponse.json(salon, { status: 201 });
}
