export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireSalon } from "@/lib/auth-guard";

const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  unidade: z.string().optional(),
  precoCompra: z.number().positive().optional(),
  precoVenda: z.number().positive().optional(),
  estoque: z.number().int().min(0).optional(),
  estoqueMin: z.number().int().min(0).optional(),
  codigo: z.string().optional(),
});

const movimentoSchema = z.object({
  tipo: z.enum(["ENTRADA", "SAIDA", "AJUSTE"]),
  quantidade: z.number().int().positive(),
  observacao: z.string().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { id } = await params;
  const body = await req.json();

  // Handle stock movement
  if (body.movimento) {
    const parsed = movimentoSchema.safeParse(body.movimento);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const produto = await prisma.produto.findFirst({ where: { id, salonId } });
    if (!produto) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });

    const delta =
      parsed.data.tipo === "ENTRADA" ? parsed.data.quantidade :
      parsed.data.tipo === "SAIDA" ? -parsed.data.quantidade :
      parsed.data.quantidade - produto.estoque;

    const [updated] = await prisma.$transaction([
      prisma.produto.update({ where: { id }, data: { estoque: { increment: delta } } }),
      prisma.movimentoEstoque.create({
        data: { produtoId: id, userId: session!.user.id, ...parsed.data },
      }),
    ]);

    return NextResponse.json({ ...updated, precoCompra: updated.precoCompra ? Number(updated.precoCompra) : null, precoVenda: updated.precoVenda ? Number(updated.precoVenda) : null });
  }

  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const updated = await prisma.produto.update({ where: { id }, data: parsed.data });
  return NextResponse.json({ ...updated, precoCompra: updated.precoCompra ? Number(updated.precoCompra) : null, precoVenda: updated.precoVenda ? Number(updated.precoVenda) : null });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { id } = await params;
  await prisma.produto.update({ where: { id }, data: { ativo: false } });
  return NextResponse.json({ ok: true });
}
