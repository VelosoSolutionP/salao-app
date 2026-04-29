import { zodMsg } from "@/lib/api-error";
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("q");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const skip = (page - 1) * limit;

  // Só role CLIENT — exclui BARBER/OWNER/MASTER cadastrados por acidente como cliente
  const userFilter = search
    ? {
        role: "CLIENT" as const,
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
          { phone: { contains: search } },
        ],
      }
    : { role: "CLIENT" as const };

  // Inclui clientes diretamente do salão OU clientes sem salão que já agendaram aqui
  const where = {
    user: userFilter,
    OR: [
      { salonId: salonId! },
      { salonId: null, agendamentos: { some: { salonId: salonId! } } },
    ],
  };

  const [clientes, total] = await Promise.all([
    prisma.cliente.findMany({
      where,
      include: {
        user: { select: { name: true, email: true, phone: true, image: true } },
      },
      orderBy: { ultimaVisita: "desc" },
      skip,
      take: limit,
    }),
    prisma.cliente.count({ where }),
  ]);

  return NextResponse.json({ clientes, total, page, pages: Math.ceil(total / limit) });
}

const createSchema = z.object({
  name:     z.string().min(2, "Nome obrigatório"),
  email:    z.string().email("Email inválido"),
  phone:    z.string().optional().nullable(),
  dataNasc: z.string().optional().nullable(),
  genero:   z.string().optional().nullable(),
  notas:    z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: zodMsg(parsed.error) }, { status: 400 });

  const { name, email, phone, dataNasc, genero, notas } = parsed.data;

  // Email já cadastrado?
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    // Funcionário (BARBER/OWNER/MASTER) não pode ser cadastrado como cliente
    if (existingUser.role !== "CLIENT") {
      return NextResponse.json(
        { error: "Este email pertence a um funcionário e não pode ser cadastrado como cliente." },
        { status: 409 }
      );
    }

    const existingCliente = await prisma.cliente.findUnique({ where: { userId: existingUser.id } });
    if (existingCliente)
      return NextResponse.json({ error: "Já existe um cliente com este email" }, { status: 409 });

    // Usuário CLIENT existe mas sem cadastro de cliente — vincula ao salão
    const cliente = await prisma.cliente.create({
      data: {
        userId: existingUser.id,
        salonId: salonId!,
        notas: notas ?? undefined,
        dataNasc: dataNasc ? new Date(dataNasc) : null,
        genero: genero ?? undefined,
      },
      include: { user: { select: { name: true, email: true, phone: true, image: true } } },
    });
    return NextResponse.json(cliente, { status: 201 });
  }

  // Cria usuário + cliente
  const user = await prisma.user.create({
    data: { name, email, phone: phone ?? undefined, role: "CLIENT" },
  });
  const cliente = await prisma.cliente.create({
    data: {
      userId: user.id,
      salonId: salonId!,
      notas: notas ?? undefined,
      dataNasc: dataNasc ? new Date(dataNasc) : null,
      genero: genero ?? undefined,
    },
    include: { user: { select: { name: true, email: true, phone: true, image: true } } },
  });
  return NextResponse.json(cliente, { status: 201 });
}
