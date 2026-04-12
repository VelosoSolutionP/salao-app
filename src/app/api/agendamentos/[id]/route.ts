export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole, requireSalon } from "@/lib/auth-guard";
import { invalidateCache, CK } from "@/lib/redis";
import { queueSSEEvent } from "@/lib/sse";
import { format } from "date-fns";

const updateSchema = z.object({
  status: z
    .enum(["CONFIRMADO", "EM_ANDAMENTO", "CONCLUIDO", "CANCELADO", "NAO_COMPARECEU"])
    .optional(),
  pagamento: z
    .enum(["DINHEIRO", "CARTAO_CREDITO", "CARTAO_DEBITO", "PIX", "TRANSFERENCIA"])
    .optional(),
  pagamentoStatus: z.enum(["PENDENTE", "PAGO", "ESTORNADO"]).optional(),
  observacoes: z.string().optional(),
  canceladoMotivo: z.string().optional(),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const agendamento = await prisma.agendamento.findFirst({
    where: { id, salonId: salonId! },
    include: {
      cliente: { include: { user: true } },
      colaborador: { include: { user: true } },
      servicos: { include: { servico: true } },
      transacao: true,
    },
  });

  if (!agendamento) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(agendamento);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireAuth();
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.agendamento.findFirst({
    where: { id, salonId: salonId! },
    include: { servicos: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  const updated = await prisma.agendamento.update({
    where: { id },
    data: parsed.data,
  });

  // Auto-create transaction when payment confirmed
  if (
    parsed.data.pagamentoStatus === "PAGO" &&
    existing.pagamentoStatus !== "PAGO"
  ) {
    await prisma.transacao.upsert({
      where: { agendamentoId: id },
      update: { valor: existing.totalPrice, metodo: parsed.data.pagamento },
      create: {
        salonId: salonId!,
        agendamentoId: id,
        tipo: "RECEITA",
        descricao: `Agendamento #${id.slice(-6)}`,
        valor: existing.totalPrice,
        metodo: parsed.data.pagamento,
        categoria: "Serviços",
      },
    });

    if (existing.clienteId) {
      await prisma.cliente.update({
        where: { id: existing.clienteId },
        data: { totalGasto: { increment: Number(existing.totalPrice) } },
      });
    }
  }

  const dateStr = format(existing.inicio, "yyyy-MM-dd");
  await invalidateCache(
    CK.SLOTS(existing.colaboradorId, dateStr),
    CK.RELATORIO(salonId!, "agendamentos", "hoje"),
    CK.RELATORIO(salonId!, "financeiro", "hoje"),
    CK.RELATORIO(salonId!, "financeiro", "semana"),
    CK.RELATORIO(salonId!, "financeiro", "mes"),
    CK.RELATORIO(salonId!, "financeiro", "ano")
  );

  await queueSSEEvent(salonId!, {
    type: "appointment.updated",
    data: { id, status: updated.status },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["OWNER", "BARBER"]);
  if (error) return error;
  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const existing = await prisma.agendamento.findFirst({
    where: { id, salonId: salonId! },
  });

  if (!existing) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  await prisma.agendamento.update({
    where: { id },
    data: { status: "CANCELADO" },
  });

  const dateStr = format(existing.inicio, "yyyy-MM-dd");
  await invalidateCache(CK.SLOTS(existing.colaboradorId, dateStr));

  await queueSSEEvent(salonId!, {
    type: "appointment.cancelled",
    data: { id },
  });

  return NextResponse.json({ message: "Agendamento cancelado" });
}

