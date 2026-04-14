"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, TrendingUp, TrendingDown, Scale } from "lucide-react";
import { formatBRL } from "@/lib/utils";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

const PERIODO_OPTIONS = [
  { value: "7", label: "7 dias" },
  { value: "15", label: "15 dias" },
  { value: "30", label: "30 dias" },
  { value: "60", label: "60 dias" },
  { value: "90", label: "90 dias" },
];

export function FluxoCaixaView() {
  const [dias, setDias] = useState("30");

  const { data, isLoading } = useQuery({
    queryKey: ["fluxo-caixa", dias],
    queryFn: () =>
      fetch(`/api/financeiro/fluxo-caixa?dias=${dias}`).then((r) => r.json()),
  });

  const fluxo = data?.fluxo ?? [];
  const totalReceita = data?.totalReceita ?? 0;
  const totalDespesa = data?.totalDespesa ?? 0;
  const saldoFinal = data?.saldoFinal ?? 0;

  const customTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-sm">
        <p className="font-semibold text-gray-700 mb-1">{label}</p>
        {payload.map((p: any) => (
          <p key={p.name} style={{ color: p.color }} className="text-xs">
            {p.name}: {formatBRL(p.value)}
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Entradas</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatBRL(totalReceita)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Saídas</p>
                <p className="text-2xl font-bold text-red-500 mt-1">{formatBRL(totalDespesa)}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-100" />
            </div>
          </CardContent>
        </Card>
        <Card className={saldoFinal >= 0 ? "border-violet-100" : "border-red-200"}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Saldo do Período</p>
                <p className={`text-2xl font-bold mt-1 ${saldoFinal >= 0 ? "text-violet-600" : "text-red-600"}`}>
                  {formatBRL(saldoFinal)}
                </p>
              </div>
              <Scale className="w-8 h-8 text-violet-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">Período:</span>
        <div className="flex gap-1">
          {PERIODO_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => setDias(o.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                dias === o.value
                  ? "bg-violet-600 text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-violet-300"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Fluxo de Caixa — Entradas vs Saídas e Saldo Acumulado</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={fluxo} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="dia"
                  tick={{ fontSize: 10 }}
                  interval={Math.floor(fluxo.length / 7)}
                />
                <YAxis
                  yAxisId="bars"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <YAxis
                  yAxisId="line"
                  orientation="right"
                  tick={{ fontSize: 10 }}
                  tickFormatter={(v) => `R$${v}`}
                />
                <Tooltip content={customTooltip} />
                <Legend />
                <Bar
                  yAxisId="bars"
                  dataKey="receita"
                  name="Entradas"
                  fill="#10b981"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
                <Bar
                  yAxisId="bars"
                  dataKey="despesa"
                  name="Saídas"
                  fill="#ef4444"
                  radius={[3, 3, 0, 0]}
                  maxBarSize={20}
                />
                <Line
                  yAxisId="line"
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo acumulado"
                  stroke="#7c3aed"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Table — last 10 days with balance */}
      {fluxo.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Detalhamento por Dia</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y max-h-72 overflow-y-auto">
              {[...fluxo].reverse().map((d: any) => (
                <div key={d.dia} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="w-12 text-xs font-medium text-gray-500">{d.dia}</span>
                  <div className="flex-1 flex items-center gap-4">
                    <span className="text-xs text-green-600 font-semibold w-24 text-right">
                      +{formatBRL(d.receita)}
                    </span>
                    <span className="text-xs text-red-500 font-semibold w-24 text-right">
                      -{formatBRL(d.despesa)}
                    </span>
                  </div>
                  <span className={`text-xs font-bold w-24 text-right ${d.saldo >= 0 ? "text-violet-600" : "text-red-600"}`}>
                    {formatBRL(d.saldo)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
