"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { formatBRL, getInitials } from "@/lib/utils";
import { Download, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";

const COLORS = ["#7c3aed", "#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export function RelatoriosView() {
  const [mes, setMes] = useState(format(new Date(), "yyyy-MM"));

  const { data: agendamentos, isLoading: loadingA } = useQuery({
    queryKey: ["relatorio-agendamentos", mes],
    queryFn: () => fetch(`/api/relatorios?tipo=agendamentos&mes=${mes}`).then((r) => r.json()),
  });

  const { data: clientes, isLoading: loadingC } = useQuery({
    queryKey: ["relatorio-clientes", mes],
    queryFn: () => fetch(`/api/relatorios?tipo=clientes&mes=${mes}`).then((r) => r.json()),
  });

  const { data: produtividade, isLoading: loadingP } = useQuery({
    queryKey: ["relatorio-produtividade", mes],
    queryFn: () => fetch(`/api/relatorios?tipo=produtividade&mes=${mes}`).then((r) => r.json()),
  });

  function exportCSV(data: any[], filename: string) {
    if (!data?.length) return;
    const keys = Object.keys(data[0]);
    const csv = [keys.join(","), ...data.map((row) => keys.map((k) => row[k]).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `${filename}-${mes}.csv`; a.click();
  }

  const statusData = agendamentos?.statusCount
    ? Object.entries(agendamentos.statusCount).map(([name, value]) => ({ name, value }))
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} className="w-44" />
        <span className="text-sm text-gray-500">Referência do período</span>
      </div>

      <Tabs defaultValue="agendamentos">
        <TabsList>
          <TabsTrigger value="agendamentos">Agendamentos</TabsTrigger>
          <TabsTrigger value="clientes">Clientes</TabsTrigger>
          <TabsTrigger value="produtividade">Produtividade</TabsTrigger>
        </TabsList>

        {/* ── Agendamentos ── */}
        <TabsContent value="agendamentos" className="space-y-4 mt-4">
          {loadingA ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-green-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Faturamento do mês</p>
                  <p className="text-2xl font-bold text-green-600 mt-1">{formatBRL(agendamentos?.totalReceita ?? 0)}</p>
                </CardContent></Card>
                <Card className="border-violet-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Ticket médio</p>
                  <p className="text-2xl font-bold text-violet-600 mt-1">{formatBRL(agendamentos?.ticketMedio ?? 0)}</p>
                </CardContent></Card>
                <Card className="border-blue-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Concluídos</p>
                  <p className="text-2xl font-bold text-blue-600 mt-1">{agendamentos?.totalConcluidos ?? 0}</p>
                </CardContent></Card>
                <Card className="border-red-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Cancelados</p>
                  <p className="text-2xl font-bold text-red-500 mt-1">{agendamentos?.totalCancelados ?? 0}</p>
                </CardContent></Card>
              </div>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => exportCSV(agendamentos?.porDia, "agendamentos")}>
                  <Download className="w-4 h-4 mr-2" />Exportar CSV
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Agendamentos por Dia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={agendamentos?.porDia ?? []} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="data" tick={{ fontSize: 10 }} interval={4} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip /><Legend />
                        <Bar dataKey="total" name="Total" fill="#7c3aed" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="concluidos" name="Concluídos" fill="#10b981" radius={[2, 2, 0, 0]} />
                        <Bar dataKey="cancelados" name="Cancelados" fill="#ef4444" radius={[2, 2, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-base">Status dos Agendamentos</CardTitle></CardHeader>
                  <CardContent className="flex justify-center">
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value"
                          label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}>
                          {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Legend /><Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* ── Clientes ── */}
        <TabsContent value="clientes" className="space-y-4 mt-4">
          {loadingC ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card className="border-blue-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Novos clientes</p>
                  <p className="text-3xl font-bold text-blue-600 mt-1">{clientes?.novos ?? 0}</p>
                </CardContent></Card>
                <Card className="border-violet-100"><CardContent className="p-4">
                  <p className="text-xs text-gray-500">Clientes recorrentes</p>
                  <p className="text-3xl font-bold text-violet-600 mt-1">{clientes?.recorrentes ?? 0}</p>
                </CardContent></Card>
              </div>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Top 10 Clientes (por gasto total)</CardTitle></CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {(clientes?.topClientes ?? []).map((c: any, i: number) => (
                      <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                        <span className="text-sm font-bold text-gray-300 w-6">#{i + 1}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{c.user.name}</p>
                          <p className="text-xs text-gray-400">{c.totalVisitas} visitas</p>
                        </div>
                        <p className="font-bold text-violet-600 text-sm">{formatBRL(c.totalGasto)}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ── Produtividade ── */}
        <TabsContent value="produtividade" className="space-y-4 mt-4">
          {loadingP ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : (
            <>
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={() => exportCSV(produtividade?.ocupacao ?? [], "produtividade")}>
                  <Download className="w-4 h-4 mr-2" />Exportar CSV
                </Button>
              </div>

              {/* Bar chart */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-base">Receita por Profissional</CardTitle></CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={produtividade?.ocupacao ?? []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="concluidos" name="Atendimentos" fill="#7c3aed" radius={[4, 4, 0, 0]} />
                      <Bar yAxisId="right" dataKey="receita" name="Receita" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Cards per collaborator */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {(produtividade?.ocupacao ?? []).map((c: any) => (
                  <Card key={c.colaboradorId}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Avatar className="w-10 h-10">
                          <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold text-sm">
                            {getInitials(c.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{c.nome}</p>
                          <p className="text-xs text-gray-400">{c.percentualComissao}% comissão</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {c.variacaoReceita > 0 ? (
                            <TrendingUp className="w-4 h-4 text-green-500" />
                          ) : c.variacaoReceita < 0 ? (
                            <TrendingDown className="w-4 h-4 text-red-500" />
                          ) : (
                            <Minus className="w-4 h-4 text-gray-400" />
                          )}
                          <span className={`text-xs font-semibold ${c.variacaoReceita > 0 ? "text-green-600" : c.variacaoReceita < 0 ? "text-red-500" : "text-gray-400"}`}>
                            {c.variacaoReceita > 0 ? "+" : ""}{c.variacaoReceita.toFixed(1)}%
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="bg-violet-50 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-violet-700">{c.concluidos}</p>
                          <p className="text-[10px] text-gray-500">Atendimentos</p>
                        </div>
                        <div className="bg-green-50 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-green-700">{formatBRL(c.ticketMedio)}</p>
                          <p className="text-[10px] text-gray-500">Ticket médio</p>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-2 text-center">
                          <p className="text-lg font-bold text-blue-700">{c.taxaConclusao}%</p>
                          <p className="text-[10px] text-gray-500">Conclusão</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t">
                        <div>
                          <p className="text-xs text-gray-500">Receita gerada</p>
                          <p className="font-bold text-gray-900">{formatBRL(c.receita)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Comissão a pagar</p>
                          <p className="font-bold text-amber-600">{formatBRL(c.comissao)}</p>
                        </div>
                      </div>

                      {c.topServicos?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {c.topServicos.map((s: any) => (
                            <Badge key={s.servicoId} variant="secondary" className="text-xs">
                              {s.nome} ({s.count}×)
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
