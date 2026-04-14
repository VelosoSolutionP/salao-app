export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireSalon } from "@/lib/auth-guard";
import { startOfDay, endOfDay, subDays, format } from "date-fns";

interface RawFluxo {
  dia: string;
  tipo: string;
  total: string | number;
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireRole(["OWNER", "MASTER"]);
  if (error) return error;
  const { salonId, error: salonError } = await requireSalon(session!);
  if (salonError) return salonError;

  const { searchParams } = req.nextUrl;
  const dias = Math.min(parseInt(searchParams.get("dias") ?? "30"), 90);

  const dataFim = endOfDay(new Date());
  const dataInicio = startOfDay(subDays(new Date(), dias - 1));

  const rows = await prisma.$queryRaw<RawFluxo[]>`
    SELECT
      TO_CHAR("dataTransacao", 'DD/MM') AS dia,
      tipo,
      COALESCE(SUM(CAST(valor AS DECIMAL)), 0) AS total
    FROM transacoes
    WHERE "salonId" = ${salonId}
      AND "dataTransacao" >= ${dataInicio}
      AND "dataTransacao" <= ${dataFim}
    GROUP BY DATE("dataTransacao"), TO_CHAR("dataTransacao", 'DD/MM'), tipo
    ORDER BY DATE("dataTransacao")
  `;

  // Build day-by-day map
  const map: Record<string, { dia: string; receita: number; despesa: number; saldo: number }> = {};
  for (let i = dias - 1; i >= 0; i--) {
    const d = subDays(new Date(), i);
    const key = format(d, "dd/MM");
    map[key] = { dia: key, receita: 0, despesa: 0, saldo: 0 };
  }

  for (const row of rows) {
    const val = typeof row.total === "string" ? parseFloat(row.total) : Number(row.total);
    if (map[row.dia]) {
      if (row.tipo === "RECEITA") map[row.dia].receita = val;
      else map[row.dia].despesa = val;
    }
  }

  // Compute running balance
  let saldoAcumulado = 0;
  const fluxo = Object.values(map).map((d) => {
    saldoAcumulado += d.receita - d.despesa;
    return { ...d, saldo: saldoAcumulado };
  });

  // Aggregates
  const totalReceita = fluxo.reduce((s, d) => s + d.receita, 0);
  const totalDespesa = fluxo.reduce((s, d) => s + d.despesa, 0);

  return NextResponse.json({
    fluxo,
    totalReceita,
    totalDespesa,
    saldoFinal: totalReceita - totalDespesa,
  });
}
