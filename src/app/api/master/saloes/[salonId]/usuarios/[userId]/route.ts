import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Params = { params: Promise<{ salonId: string; userId: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { salonId, userId } = await params;

  // Verify the user belongs to this salon (as owner or barber)
  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true } });
  if (!salon) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

  const colaborador = await prisma.colaborador.findFirst({ where: { userId, salonId } });
  const isOwner = salon.ownerId === userId;
  if (!colaborador && !isOwner) return NextResponse.json({ error: "Usuário não pertence a este salão" }, { status: 404 });

  const body = await req.json();
  const { name, email, phone, password, active, blocked } = body;

  if (email?.trim()) {
    const conflict = await prisma.user.findFirst({ where: { email: email.toLowerCase().trim(), NOT: { id: userId } } });
    if (conflict) return NextResponse.json({ error: "E-mail já está em uso por outro usuário" }, { status: 409 });
  }

  const userUpdate: Record<string, unknown> = {};
  if (name?.trim()) userUpdate.name = name.trim();
  if (email?.trim()) userUpdate.email = email.toLowerCase().trim();
  if (phone !== undefined) userUpdate.phone = phone?.trim() || null;
  if (password?.trim()) userUpdate.passwordHash = await bcrypt.hash(password.trim(), 12);
  if (active !== undefined) userUpdate.active = Boolean(active);
  if (blocked !== undefined) userUpdate.blocked = Boolean(blocked);

  await prisma.user.update({ where: { id: userId }, data: userUpdate });

  // Sync active status to colaborador record
  if (active !== undefined && colaborador) {
    await prisma.colaborador.update({ where: { id: colaborador.id }, data: { active: Boolean(active) } });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { salonId, userId } = await params;

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true } });
  if (!salon) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

  if (salon.ownerId === userId) {
    return NextResponse.json({ error: "Não é possível remover o proprietário do salão" }, { status: 400 });
  }

  const colaborador = await prisma.colaborador.findFirst({ where: { userId, salonId } });
  if (!colaborador) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

  await prisma.$transaction([
    prisma.colaborador.delete({ where: { id: colaborador.id } }),
    prisma.user.update({ where: { id: userId }, data: { active: false } }),
  ]);

  return NextResponse.json({ ok: true });
}
