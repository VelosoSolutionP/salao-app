import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { addDays } from "date-fns";

const TRIAL_DAYS = 30;

const schema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  role: z.enum(["OWNER", "CLIENT", "BARBER"]).default("CLIENT"),
  salonName: z.string().optional(),
  codigoConvite: z.string().optional(), // código do salão para funcionários (BARBER)
  refCode: z.string().nullable().optional(), // código de indicação do revendedor
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: zodMsg(parsed.error) },
      { status: 400 }
    );
  }

  const { name, email, password, phone, role, salonName, codigoConvite, refCode } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email já cadastrado" },
      { status: 409 }
    );
  }

  // BARBER: validate invite code before creating anything
  let barberSalonId: string | null = null;
  if (role === "BARBER") {
    if (!codigoConvite) {
      return NextResponse.json(
        { error: "Código do salão é obrigatório para funcionários" },
        { status: 400 }
      );
    }
    const salonByCode = await prisma.salon.findUnique({
      where: { codigoConvite: codigoConvite.toUpperCase() },
    });
    if (!salonByCode) {
      return NextResponse.json(
        { error: "Código do salão inválido ou inexistente" },
        { status: 400 }
      );
    }
    barberSalonId = salonByCode.id;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name,
        email: email.toLowerCase(),
        passwordHash,
        phone,
        role,
        // OWNER starts a 30-day free trial; others have no restriction
        trialExpires: role === "OWNER" ? addDays(new Date(), TRIAL_DAYS) : null,
      },
    });

    if (role === "CLIENT") {
      await tx.cliente.create({
        data: { userId: newUser.id },
      });
    }

    if (role === "BARBER" && barberSalonId) {
      await tx.colaborador.create({
        data: { userId: newUser.id, salonId: barberSalonId },
      });
    }

    if (role === "OWNER" && salonName) {
      const slug = slugify(salonName);

      // Resolve referral code — check Revendedor first, then Indicador
      let indicacaoId: string | undefined;
      let indicadorId: string | undefined;
      if (refCode) {
        const revendedor = await tx.revendedor.findUnique({
          where: { codigo: refCode.toUpperCase(), ativo: true },
        });
        if (revendedor) {
          const indicacao = await tx.indicacao.create({
            data: { revendedorId: revendedor.id, status: "CONVERTIDA" },
          });
          indicacaoId = indicacao.id;
        } else {
          // Try Indicador
          const indicador = await tx.indicador.findUnique({
            where: { codigo: refCode.toUpperCase(), ativo: true },
          });
          if (indicador) {
            indicadorId = indicador.id;
          }
        }
      }

      // Generate a unique 6-char invite code for the salon
      const inviteCode = Math.random().toString(36).slice(2, 8).toUpperCase();

      const salon = await tx.salon.create({
        data: {
          ownerId: newUser.id,
          name: salonName,
          slug: `${slug}-${Date.now()}`,
          codigoConvite: inviteCode,
          ...(indicacaoId && { indicacaoId }),
          ...(indicadorId && { indicadorId }),
        },
      });

      // Create default working hours (Mon-Sat 8h-20h)
      await tx.horarioSalon.createMany({
        data: [1, 2, 3, 4, 5, 6].map((day) => ({
          salonId: salon.id,
          diaSemana: day,
          abre: "08:00",
          fecha: "20:00",
        })),
      });
    }

    await tx.notifConfig.create({
      data: { userId: newUser.id },
    });

    return newUser;
  });

  return NextResponse.json(
    { message: "Conta criada com sucesso", userId: user.id },
    { status: 201 }
  );
}
