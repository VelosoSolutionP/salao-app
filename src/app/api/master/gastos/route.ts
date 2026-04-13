import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { descricao, valor, categoria, data } = await request.json();

  if (!descricao || !valor) {
    return NextResponse.json({ error: "descricao e valor são obrigatórios" }, { status: 400 });
  }

  const gasto = await prisma.gastoPlataforma.create({
    data: {
      descricao,
      valor,
      categoria: categoria ?? "Geral",
      data: data ? new Date(data) : new Date(),
    },
  });

  return NextResponse.json(gasto);
}

export async function DELETE(request: Request) {
  const session = await auth();
  if (session?.user?.role !== "MASTER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id obrigatório" }, { status: 400 });

  await prisma.gastoPlataforma.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
