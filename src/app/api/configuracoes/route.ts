import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pixKey: z.string().optional(),
  pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]).optional(),
  logoUrl: z.string().url().optional().nullable(),
  coverUrl: z.string().url().optional().nullable(),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  bgColor:    z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().nullable(),
  // Política de cancelamento
  cancelamentoHorasMinimo: z.number().int().min(0).max(168).optional(),
  multaValor: z.number().min(0).nullable().optional(),
  multaTipo: z.enum(["PERCENTUAL", "FIXO"]).optional().nullable(),
  // Lembretes WhatsApp
  lembreteAntecedenciaMinutos: z.number().int().min(0).max(1440).optional(),
  horarios: z
    .array(
      z.object({
        diaSemana: z.number().min(0).max(6),
        abre: z.string(),
        fecha: z.string(),
        fechado: z.boolean(),
      })
    )
    .optional(),
});

export async function GET() {
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;

  const salon = await prisma.salon.findFirst({
    where: session!.user.role === "OWNER"
      ? { ownerId: session!.user.id }
      : { colaboradores: { some: { userId: session!.user.id } } },
    include: { horarios: { orderBy: { diaSemana: "asc" } } },
  });

  if (!salon) return NextResponse.json(null);

  return NextResponse.json({
    ...salon,
    multaValor: salon.multaValor ? Number(salon.multaValor) : null,
  });
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const salonResult = await requireSalon(session!);
  let salonId: string | null = salonResult.salonId;

  if (!salonId) {
    const salon = await prisma.salon.findFirst({
      where: { ownerId: session!.user.id },
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    salonId = salon?.id ?? null;
  }

  if (!salonId) {
    return NextResponse.json({ error: "Salão não encontrado" }, { status: 404 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });
  }

  const { horarios, multaValor, ...rest } = parsed.data;
  const salonData: Record<string, unknown> = {
    ...rest,
    ...(multaValor !== undefined && { multaValor }),
  };

  await prisma.$transaction(async (tx) => {
    await tx.salon.update({
      where: { id: salonId! },
      data: salonData,
    });

    if (horarios) {
      await tx.horarioSalon.deleteMany({ where: { salonId: salonId! } });
      await tx.horarioSalon.createMany({
        data: horarios.map((h) => ({ ...h, salonId: salonId! })),
      });
    }
  });

  return NextResponse.json({ message: "Configurações atualizadas" });
}
