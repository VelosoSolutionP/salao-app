export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { startOfMonth, endOfMonth, format } from "date-fns";
import { ptBR } from "date-fns/locale";

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const colaboradorId = searchParams.get("colaboradorId");
  const mes = searchParams.get("mes") ?? format(new Date(), "yyyy-MM");

  if (!colaboradorId) {
    return NextResponse.json({ error: "colaboradorId obrigatório" }, { status: 400 });
  }

  const [year, month] = mes.split("-").map(Number);
  const dataInicio = startOfMonth(new Date(year, month - 1));
  const dataFim = endOfMonth(new Date(year, month - 1));

  // Fetch collaborator details
  const colaborador = await prisma.colaborador.findFirst({
    where: { id: colaboradorId, salonId },
    include: { user: { select: { name: true, email: true, phone: true } } },
  });
  if (!colaborador) {
    return NextResponse.json({ error: "Colaborador não encontrado" }, { status: 404 });
  }

  // Fetch all commissions in the period
  const comissoes = await prisma.comissaoColaborador.findMany({
    where: {
      colaboradorId,
      salonId,
      createdAt: { gte: dataInicio, lte: dataFim },
    },
    include: {
      agendamento: {
        include: {
          cliente: { include: { user: { select: { name: true } } } },
          servicos: {
            include: { servico: { select: { nome: true, categoria: true } } },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Build line items
  const atendimentos = comissoes.map((c) => {
    const ag = c.agendamento;
    return {
      data: format(ag.inicio, "dd/MM/yyyy", { locale: ptBR }),
      horario: format(ag.inicio, "HH:mm"),
      cliente: ag.cliente?.user?.name ?? "Walk-in",
      servicos: ag.servicos.map((s) => s.servico.nome).join(", "),
      valorServico: Number(ag.totalPrice),
      tipoProduto: c.tipoProduto,
      percentual: Number(c.percentual) * 100,
      valorComissao: Number(c.valor),
      pago: c.pago,
      pagoEm: c.pagoEm ? format(c.pagoEm, "dd/MM/yyyy") : null,
    };
  });

  const totalServicos = atendimentos.reduce((s, a) => s + a.valorServico, 0);
  const totalComissao = atendimentos.reduce((s, a) => s + a.valorComissao, 0);
  const totalPago = atendimentos.filter((a) => a.pago).reduce((s, a) => s + a.valorComissao, 0);
  const totalPendente = totalComissao - totalPago;

  const mesLabel = format(new Date(year, month - 1), "MMMM 'de' yyyy", { locale: ptBR });
  const mesLabel2 = mesLabel.charAt(0).toUpperCase() + mesLabel.slice(1);

  return NextResponse.json({
    colaborador: {
      id: colaborador.id,
      nome: colaborador.user.name,
      email: colaborador.user.email,
      telefone: colaborador.user.phone,
      comissaoSalaoProduto: Number(colaborador.comissaoSalaoProduto) * 100,
      comissaoProprioProduto: Number(colaborador.comissaoProprioProduto) * 100,
    },
    periodo: mesLabel2,
    mes,
    atendimentos,
    totalAtendimentos: atendimentos.length,
    totalServicos,
    totalComissao,
    totalPago,
    totalPendente,
  });
}
