import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { getPlano } from "@/lib/planos";

type Params = { params: Promise<{ salonId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { salonId } = await params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      name: true,
      owner: {
        select: { id: true, name: true, email: true, phone: true, active: true, blocked: true, role: true },
      },
      colaboradores: {
        select: {
          id: true,
          active: true,
          user: {
            select: { id: true, name: true, email: true, phone: true, active: true, blocked: true, role: true, createdAt: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      contratos: {
        where: { ativo: true },
        select: { plano: true },
        take: 1,
      },
    },
  });

  if (!salon) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

  const planoTipo = salon.contratos[0]?.plano ?? "BASICO";
  const planoConfig = getPlano(planoTipo);
  const maxFuncionarios = planoConfig.maxFuncionarios;

  return NextResponse.json({
    salon: { id: salon.id, name: salon.name },
    owner: salon.owner,
    barbers: salon.colaboradores,
    plano: planoTipo,
    maxFuncionarios,
    totalBarbers: salon.colaboradores.length,
  });
}

export async function POST(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { salonId } = await params;

  const salon = await prisma.salon.findUnique({
    where: { id: salonId },
    select: {
      id: true,
      name: true,
      contratos: { where: { ativo: true }, select: { plano: true }, take: 1 },
      colaboradores: { select: { id: true } },
    },
  });

  if (!salon) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

  // Enforce plan limit
  const planoTipo = salon.contratos[0]?.plano ?? "BASICO";
  const planoConfig = getPlano(planoTipo);
  const max = planoConfig.maxFuncionarios;
  if (max !== null && salon.colaboradores.length >= max) {
    return NextResponse.json(
      { error: `Limite de ${max} funcionário(s) atingido no plano ${planoConfig.nome}` },
      { status: 422 }
    );
  }

  const body = await req.json();
  const { name, email, phone, password } = body;

  if (!name?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

  const senhaFinal = password?.trim() || (Math.random().toString(36).slice(-8) + "A1!");
  const passwordHash = await bcrypt.hash(senhaFinal, 12);

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() || null,
        role: "BARBER",
      },
    });

    await tx.colaborador.create({
      data: { userId: user.id, salonId },
    });

    await tx.notifConfig.create({ data: { userId: user.id } });

    return { userId: user.id, senhaGerada: !password?.trim() ? senhaFinal : null };
  });

  return NextResponse.json(result, { status: 201 });
}
