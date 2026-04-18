import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const contratos = await prisma.contratoSalao.findMany({
    where: { ativo: true },
    select: {
      id: true,
      plano: true,
      valorMensal: true,
      diaVencimento: true,
      createdAt: true,
      salon: { select: { id: true, name: true, city: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  type Tier = { count: number; receita: number; saloes: typeof contratos };
  const byPlano: Record<string, Tier> = {
    BASICO: { count: 0, receita: 0, saloes: [] },
    PRATA:  { count: 0, receita: 0, saloes: [] },
    OURO:   { count: 0, receita: 0, saloes: [] },
  };

  for (const c of contratos) {
    const p = (c.plano as string) ?? "BASICO";
    if (!byPlano[p]) byPlano[p] = { count: 0, receita: 0, saloes: [] };
    byPlano[p].count++;
    byPlano[p].receita += Number(c.valorMensal);
    byPlano[p].saloes.push(c);
  }

  return NextResponse.json({
    total: contratos.length,
    receitaTotal: contratos.reduce((s, c) => s + Number(c.valorMensal), 0),
    byPlano,
    contratos,
  });
}
