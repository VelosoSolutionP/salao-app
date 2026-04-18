import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { slugify } from "@/lib/utils";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const saloes = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      city: true,
      logoUrl: true,
      active: true,
      createdAt: true,
      owner: {
        select: { id: true, name: true, email: true, phone: true, blocked: true, trialExpires: true },
      },
      contratos: {
        where: { ativo: true },
        select: { id: true, valorMensal: true, ativo: true, diaVencimento: true, plano: true },
      },
    },
  });

  return NextResponse.json(saloes);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { salonName, ownerName, email, phone, password, contratoValor, contratoDia, contratoPlano } = body;

  if (!salonName?.trim() || !ownerName?.trim() || !email?.trim()) {
    return NextResponse.json({ error: "Nome do salão, proprietário e e-mail são obrigatórios" }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (existing) return NextResponse.json({ error: "E-mail já cadastrado" }, { status: 409 });

  const senhaFinal = password?.trim() || (Math.random().toString(36).slice(-8) + "A1!");
  const passwordHash = await bcrypt.hash(senhaFinal, 12);
  const slug = slugify(salonName);
  const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: ownerName.trim(),
        email: email.toLowerCase().trim(),
        passwordHash,
        phone: phone?.trim() || null,
        role: "OWNER",
        trialExpires: addDays(new Date(), 30),
      },
    });

    const salon = await tx.salon.create({
      data: {
        ownerId: user.id,
        name: salonName.trim(),
        slug: `${slug}-${Date.now()}`,
        codigoConvite: inviteCode,
      },
    });

    await tx.horarioSalon.createMany({
      data: [1, 2, 3, 4, 5, 6].map((day) => ({
        salonId: salon.id,
        diaSemana: day,
        abre: "08:00",
        fecha: "20:00",
      })),
    });

    await tx.notifConfig.create({ data: { userId: user.id } });

    if (contratoValor) {
      await tx.contratoSalao.create({
        data: {
          salonId: salon.id,
          valorMensal: parseFloat(String(contratoValor).replace(",", ".")),
          diaVencimento: Number(contratoDia) || 10,
          plano: body.contratoPlano ?? "BASICO",
        },
      });
    }

    return { salonId: salon.id, senhaGerada: !password?.trim() ? senhaFinal : null };
  });

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const { salonId, salonName, city, logoUrl, ownerName, phone } = body;

  if (!salonId) return NextResponse.json({ error: "salonId obrigatório" }, { status: 400 });

  const salon = await prisma.salon.findUnique({ where: { id: salonId }, select: { ownerId: true } });
  if (!salon) return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });

  await prisma.$transaction([
    prisma.salon.update({
      where: { id: salonId },
      data: {
        ...(salonName?.trim() && { name: salonName.trim() }),
        ...(city !== undefined && { city: city?.trim() || null }),
        ...(logoUrl !== undefined && { logoUrl: logoUrl || null }),
      },
    }),
    prisma.user.update({
      where: { id: salon.ownerId },
      data: {
        ...(ownerName?.trim() && { name: ownerName.trim() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
