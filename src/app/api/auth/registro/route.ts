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
  role: z.enum(["OWNER", "CLIENT"]).default("CLIENT"),
  salonName: z.string().optional(),
  refCode: z.string().optional(), // código de indicação do revendedor
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Dados inválidos", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, email, password, phone, role, salonName, refCode } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Email já cadastrado" },
      { status: 409 }
    );
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
        // OWNER starts a 30-day free trial; CLIENT has no restriction
        trialExpires: role === "OWNER" ? addDays(new Date(), TRIAL_DAYS) : null,
      },
    });

    if (role === "CLIENT") {
      await tx.cliente.create({
        data: { userId: newUser.id },
      });
    }

    if (role === "OWNER" && salonName) {
      const slug = slugify(salonName);

      // Resolve referral code
      let indicacaoId: string | undefined;
      if (refCode) {
        const revendedor = await tx.revendedor.findUnique({
          where: { codigo: refCode.toUpperCase(), ativo: true },
        });
        if (revendedor) {
          const indicacao = await tx.indicacao.create({
            data: { revendedorId: revendedor.id, status: "CONVERTIDA" },
          });
          indicacaoId = indicacao.id;
        }
      }

      const salon = await tx.salon.create({
        data: {
          ownerId: newUser.id,
          name: salonName,
          slug: `${slug}-${Date.now()}`,
          ...(indicacaoId && { indicacaoId }),
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
