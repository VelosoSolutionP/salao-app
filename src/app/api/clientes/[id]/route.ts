export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";

const updateSchema = z.object({
  name:     z.string().min(2).optional(),
  phone:    z.string().optional().nullable(),
  notas:    z.string().optional().nullable(),
  dataNasc: z.string().optional().nullable(),
  genero:   z.string().optional().nullable(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const withHistory = req.nextUrl.searchParams.get("historico") === "true";

  const cliente = await prisma.cliente.findFirst({
    where: { id, salonId: salonId! },
    include: {
      user: true,
      ...(withHistory
        ? {
            agendamentos: {
              include: {
                servicos:    { include: { servico: true } },
                colaborador: { include: { user: { select: { name: true } } } },
              },
              orderBy: { inicio: "desc" },
              take: 20,
            },
          }
        : {}),
    },
  });

  if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  return NextResponse.json(cliente);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const cliente = await prisma.cliente.findFirst({ where: { id, salonId: salonId! } });
  if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  const { name, phone, notas, dataNasc, genero } = parsed.data;

  await Promise.all([
    // Atualiza dados do usuário (nome e telefone)
    (name !== undefined || phone !== undefined)
      ? prisma.user.update({
          where: { id: cliente.userId },
          data: {
            ...(name  !== undefined && { name }),
            ...(phone !== undefined && { phone: phone ?? undefined }),
          },
        })
      : Promise.resolve(),

    // Atualiza dados do cliente
    prisma.cliente.update({
      where: { id },
      data: {
        ...(notas    !== undefined && { notas:    notas ?? undefined }),
        ...(genero   !== undefined && { genero:   genero ?? undefined }),
        ...(dataNasc !== undefined && { dataNasc: dataNasc ? new Date(dataNasc) : null }),
      },
    }),
  ]);

  return NextResponse.json({ message: "Cliente atualizado" });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  // Apenas o proprietário pode excluir clientes
  const { session, error } = await requireRole(["OWNER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const cliente = await prisma.cliente.findFirst({
    where: { id, salonId: salonId! },
  });
  if (!cliente) return NextResponse.json({ error: "Não encontrado" }, { status: 404 });

  // Excluir o usuário faz cascade no cliente
  await prisma.user.delete({ where: { id: cliente.userId } });
  return NextResponse.json({ message: "Cliente removido" });
}
