export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { consultarPagamento } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MP envia type=payment quando um pagamento ocorre
    if (body.type !== "payment" || !body.data?.id) {
      return NextResponse.json({ ok: true });
    }

    const mpPagamentoId = String(body.data.id);
    const pagamento = await consultarPagamento(mpPagamentoId);

    if (pagamento.status !== "approved") {
      return NextResponse.json({ ok: true });
    }

    const pagamentoId = pagamento.external_reference;
    if (!pagamentoId) {
      return NextResponse.json({ ok: true });
    }

    // Marca como pago
    const registro = await prisma.pagamentoContrato.update({
      where: { id: pagamentoId },
      data: {
        pago: true,
        pagoEm: new Date(),
        mpPagamentoId,
      },
      include: {
        contrato: {
          include: {
            salon: {
              include: { owner: true, indicacao: true },
            },
          },
        },
      },
    });

    // Desbloqueia o dono se estava bloqueado por falta de pagamento
    const owner = registro.contrato.salon.owner;
    if (owner.blocked) {
      await prisma.user.update({
        where: { id: owner.id },
        data: { blocked: false },
      });
    }

    // Processa comissão do revendedor se houver indicação
    const indicacao = registro.contrato.salon.indicacao;
    if (indicacao) {
      // Conta quantos pagamentos aprovados esse revendedor já recebeu desse salão
      const pagamentosAnteriores = await prisma.comissao.count({
        where: {
          revendedorId: indicacao.revendedorId,
          indicacaoId: indicacao.id,
        },
      });

      const revendedor = await prisma.revendedor.findUnique({
        where: { id: indicacao.revendedorId },
      });

      if (revendedor?.ativo) {
        const ehBonus = pagamentosAnteriores < 2; // primeiros 2 = 100%
        const percentual = ehBonus
          ? 100
          : Number(revendedor.percentual);
        const valorComissao =
          (Number(registro.valor) * percentual) / 100;

        await prisma.comissao.create({
          data: {
            revendedorId: revendedor.id,
            indicacaoId: indicacao.id,
            pagamentoId: registro.id,
            valor: valorComissao,
            percentual,
            ehBonus,
            referencia: registro.referencia,
          },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook MP erro:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}

// MP também faz GET para verificar a URL
export async function GET() {
  return NextResponse.json({ ok: true });
}
