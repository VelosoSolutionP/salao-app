export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { differenceInHours } from "date-fns";

/**
 * PATCH /api/agendamentos/cliente/[id]
 * Cancela ou solicita alteração de um agendamento pelo próprio cliente.
 *
 * Regras:
 *   - Só o cliente dono do agendamento pode cancelar.
 *   - Se o cancelamento ocorrer DENTRO do prazo → status = CANCELADO.
 *   - Se ocorrer FORA do prazo → status = NAO_COMPARECEU + multa aplicada.
 *   - Agendamentos já encerrados (CONCLUIDO, NAO_COMPARECEU, CANCELADO) não podem ser alterados.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["CLIENT"]);
  if (error) return error;

  // Fetch the appointment
  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      salon: {
        select: {
          cancelamentoHorasMinimo: true,
          multaValor: true,
          multaTipo: true,
        },
      },
      cliente: { select: { userId: true } },
    },
  });

  if (!agendamento) {
    return NextResponse.json({ error: "Agendamento não encontrado" }, { status: 404 });
  }

  // Ensure this agendamento belongs to the requesting client
  if (agendamento.cliente?.userId !== session!.user.id) {
    return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
  }

  // Cannot touch finished appointments
  const finalStatuses = ["CONCLUIDO", "NAO_COMPARECEU", "CANCELADO"];
  if (finalStatuses.includes(agendamento.status)) {
    return NextResponse.json(
      { error: "Este agendamento já foi encerrado e não pode ser alterado" },
      { status: 422 }
    );
  }

  const now = new Date();
  const horasAteInicio = differenceInHours(agendamento.inicio, now);
  const prazoMinimo = agendamento.salon.cancelamentoHorasMinimo;
  const dentroDoPrazo = horasAteInicio >= prazoMinimo;

  if (dentroDoPrazo) {
    // Within cancellation window — cancel normally
    await prisma.agendamento.update({
      where: { id },
      data: {
        status: "CANCELADO",
        canceladoPorCliente: true,
        canceladoMotivo: "Cancelado pelo cliente",
      },
    });

    return NextResponse.json({
      status: "CANCELADO",
      message: "Agendamento cancelado com sucesso.",
    });
  }

  // Outside cancellation window — mark as no-show and apply fine
  let multaValorCalculado: number | null = null;

  if (agendamento.salon.multaValor) {
    const baseValor = Number(agendamento.totalPrice);
    const multaConfig = Number(agendamento.salon.multaValor);

    if (agendamento.salon.multaTipo === "PERCENTUAL") {
      multaValorCalculado = parseFloat(((baseValor * multaConfig) / 100).toFixed(2));
    } else {
      multaValorCalculado = multaConfig;
    }
  }

  await prisma.agendamento.update({
    where: { id },
    data: {
      status: "NAO_COMPARECEU",
      canceladoPorCliente: true,
      canceladoMotivo: `Cancelamento fora do prazo (mínimo ${prazoMinimo}h de antecedência)`,
      ...(multaValorCalculado !== null && {
        multaAplicada: true,
        multaValor: multaValorCalculado,
      }),
    },
  });

  return NextResponse.json({
    status: "NAO_COMPARECEU",
    multaAplicada: multaValorCalculado !== null,
    multaValor: multaValorCalculado,
    message:
      multaValorCalculado !== null
        ? `Cancelamento fora do prazo registrado. Uma taxa de R$ ${multaValorCalculado.toFixed(2)} será cobrada no seu próximo agendamento, conforme a política do salão.`
        : `Cancelamento fora do prazo registrado. O agendamento foi encerrado como não comparecimento.`,
  });
}

/**
 * GET /api/agendamentos/cliente/[id]
 * Retorna um agendamento do cliente autenticado.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { session, error } = await requireRole(["CLIENT"]);
  if (error) return error;

  const agendamento = await prisma.agendamento.findUnique({
    where: { id },
    include: {
      salon: { select: { name: true, cancelamentoHorasMinimo: true, multaValor: true, multaTipo: true } },
      colaborador: { include: { user: { select: { name: true, image: true } } } },
      servicos: { include: { servico: true } },
      cliente: { select: { userId: true } },
    },
  });

  if (!agendamento || agendamento.cliente?.userId !== session!.user.id) {
    return NextResponse.json({ error: "Não encontrado" }, { status: 404 });
  }

  return NextResponse.json(agendamento);
}
