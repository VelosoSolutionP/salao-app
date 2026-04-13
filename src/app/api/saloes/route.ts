export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";

const createSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
});

export async function GET() {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const salons = await prisma.salon.findMany({
    where: { ownerId: session!.user.id },
    select: { id: true, name: true, slug: true, logoUrl: true, active: true },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(salons);
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
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
      ownerId: session!.user.id,
      name: parsed.data.name,
      slug,
    },
  });

  return NextResponse.json(salon, { status: 201 });
}
