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
  // Política de cancelamento
  cancelamentoHorasMinimo: z.number().int().min(0).max(168).optional(),
  multaValor: z.number().min(0).optional(),
  multaTipo: z.enum(["PERCENTUAL", "FIXO"]).optional().nullable(),
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
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;

  const salon = await prisma.salon.findFirst({
    where: { ownerId: session!.user.id },
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
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { horarios, multaValor, ...rest } = parsed.data;
  const salonData = {
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
