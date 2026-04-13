import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const saloes = await prisma.salon.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { id: true, name: true, email: true, blocked: true, trialExpires: true } },
      contratos: { where: { ativo: true }, select: { id: true, valorMensal: true, ativo: true } },
    },
  });

  return NextResponse.json(saloes);
}
