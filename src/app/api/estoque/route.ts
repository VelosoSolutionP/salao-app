export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireSalon } from "@/lib/auth-guard";

const produtoSchema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  categoria: z.string().optional(),
  marca: z.string().optional(),
  unidade: z.string().default("un"),
  precoCompra: z.number().positive().optional(),
  precoVenda: z.number().positive().optional(),
  estoque: z.number().int().min(0).default(0),
  estoqueMin: z.number().int().min(0).default(5),
  codigo: z.string().optional(),
});

export async function GET() {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const produtos = await prisma.produto.findMany({
    where: { salonId, ativo: true },
    orderBy: { nome: "asc" },
  });

  return NextResponse.json(produtos.map((p) => ({
    ...p,
    precoCompra: p.precoCompra ? Number(p.precoCompra) : null,
    precoVenda: p.precoVenda ? Number(p.precoVenda) : null,
    baixoEstoque: p.estoque <= p.estoqueMin,
  })));
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = produtoSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const produto = await prisma.produto.create({
    data: { salonId, ...parsed.data },
  });

  return NextResponse.json({ ...produto, precoCompra: produto.precoCompra ? Number(produto.precoCompra) : null, precoVenda: produto.precoVenda ? Number(produto.precoVenda) : null });
}
