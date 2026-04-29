"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { formatBRL, formatDate } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { ComissoesView } from "./ComissoesView";
import { FluxoCaixaView } from "./FluxoCaixaView";

const PERIODO_OPTIONS = [
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Últimos 7 dias" },
  { value: "mes", label: "Este mês" },
  { value: "ano", label: "Este ano" },
];

const METODOS = [
  { value: "DINHEIRO",       label: "Dinheiro" },
  { value: "PIX",            label: "PIX" },
  { value: "CARTAO_CREDITO", label: "Cartão de Crédito" },
  { value: "CARTAO_DEBITO",  label: "Cartão de Débito" },
  { value: "TRANSFERENCIA",  label: "Transferência" },
] as const;

export function FinanceiroView() {
  const queryClient = useQueryClient();
  const [periodo, setPeriodo] = useState("mes");
  const [modalOpen, setModalOpen] = useState(false);

  /* ── modal state (plain useState — no RHF in portal) ── */
  const [tipo, setTipo]           = useState<"RECEITA" | "DESPESA">("DESPESA");
  const [descricao, setDescricao] = useState("");
  const [valor, setValor]         = useState("");
  const [metodo, setMetodo]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetModal() {
    setTipo("DESPESA");
    setDescricao("");
    setValor("");
    setMetodo("");
    setCategoria("");
    setFieldErrors({});
  }

  const { data: resumo } = useQuery({
    queryKey: ["financeiro-resumo", periodo],
    queryFn: async () => {
      const r = await fetch(`/api/financeiro/resumo?periodo=${periodo}`);
      const json = await r.json();
      if (!r.ok || json?.error) {
        toast.error(`Erro ao carregar resumo financeiro`);
      }
      return json;
    },
  });

  const { data: transacoesData, isLoading } = useQuery({
    queryKey: ["transacoes"],
    queryFn: () => fetch("/api/financeiro/transacoes?limit=30").then((r) => r.json()),
  });

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!descricao.trim()) errs.descricao = "Obrigatório";
    const num = parseFloat(valor);
    if (!valor || isNaN(num) || num <= 0) errs.valor = "Informe um valor positivo";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/financeiro/transacoes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo,
          descricao: descricao.trim(),
          valor: num,
          metodo: metodo || undefined,
          categoria: categoria.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao registrar"); return; }
      toast.success("Transação registrada!");
      queryClient.invalidateQueries({ queryKey: ["transacoes"] });
      queryClient.invalidateQueries({ queryKey: ["financeiro-resumo"] });
      setModalOpen(false);
      resetModal();
    } catch {
      toast.error("Erro ao registrar");
    } finally {
      setSubmitting(false);
    }
  }

  const chartData = (resumo?.receitaPorServico ?? []).slice(0, 5).map((s: any) => ({
    name: s.nome.length > 12 ? s.nome.slice(0, 12) + "..." : s.nome,
    total: s.total,
    quantidade: s.count,
  }));

  return (
    <>
      <Tabs defaultValue="resumo">
        <TabsList>
          <TabsTrigger value="resumo">Resumo</TabsTrigger>
          <TabsTrigger value="fluxo">Fluxo de Caixa</TabsTrigger>
          <TabsTrigger value="comissoes">Comissões</TabsTrigger>
        </TabsList>

        <TabsContent value="fluxo" className="mt-4">
          <FluxoCaixaView />
        </TabsContent>

        <TabsContent value="comissoes" className="mt-4">
          <ComissoesView />
        </TabsContent>

        <TabsContent value="resumo" className="mt-4 space-y-4">
      <div className="flex items-center justify-between">
        <Select value={periodo} onValueChange={setPeriodo}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIODO_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova transação
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Receita</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatBRL(resumo?.totalReceita ?? 0)}
                </p>
                {resumo?.variacao !== undefined && (
                  <p className={`text-xs mt-1 ${resumo.variacao >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {resumo.variacao >= 0 ? "+" : ""}{resumo.variacao.toFixed(1)}% vs mês anterior
                  </p>
                )}
              </div>
              <TrendingUp className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Despesas</p>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {formatBRL(resumo?.totalDespesa ?? 0)}
                </p>
              </div>
              <TrendingDown className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-violet-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Lucro</p>
                <p className={`text-2xl font-bold mt-1 ${(resumo?.lucro ?? 0) >= 0 ? "text-violet-600" : "text-red-600"}`}>
                  {formatBRL(resumo?.lucro ?? 0)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {resumo?.agendamentosCount ?? 0} atendimentos
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-violet-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receita por Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div style={{minWidth:0}}><ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v}`} />
                <Tooltip formatter={(v) => formatBRL(Number(v))} />
                <Legend />
                <Bar dataKey="total" name="Receita" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer></div>
          </CardContent>
        </Card>
      )}

      {/* Transactions table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Últimas Transações</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : (transacoesData?.transacoes ?? []).length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-8">Nenhuma transação registrada</p>
          ) : (
            <div className="divide-y">
              {(transacoesData?.transacoes ?? []).map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <div className={`w-2 h-8 rounded-full flex-shrink-0 ${t.tipo === "RECEITA" ? "bg-green-400" : "bg-red-400"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.descricao}</p>
                    <p className="text-xs text-gray-400">
                      {formatDate(t.dataTransacao)} • {t.categoria ?? "Geral"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-sm ${t.tipo === "RECEITA" ? "text-green-600" : "text-red-500"}`}>
                      {t.tipo === "RECEITA" ? "+" : "-"}{formatBRL(t.valor)}
                    </p>
                    {t.metodo && (
                      <Badge variant="outline" className="text-xs mt-0.5">{t.metodo}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) { setModalOpen(false); resetModal(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Transação</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Tipo */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
              <div className="grid grid-cols-2 gap-2">
                {(["RECEITA", "DESPESA"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={`py-2 rounded-lg border-2 text-sm font-semibold transition-all ${
                      tipo === t
                        ? t === "RECEITA"
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-red-400 bg-red-50 text-red-600"
                        : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    {t === "RECEITA" ? "Receita" : "Despesa"}
                  </button>
                ))}
              </div>
            </div>

            {/* Descrição */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
              <input
                type="text"
                placeholder="Aluguel, produto, serviço..."
                value={descricao}
                onChange={(e) => { setDescricao(e.target.value); setFieldErrors((er) => ({ ...er, descricao: "" })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
              {fieldErrors.descricao && <p className="text-xs text-red-500 mt-1">{fieldErrors.descricao}</p>}
            </div>

            {/* Valor + Método */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => { setValor(e.target.value); setFieldErrors((er) => ({ ...er, valor: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
                />
                {fieldErrors.valor && <p className="text-xs text-red-500 mt-1">{fieldErrors.valor}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Método</label>
                <select
                  value={metodo}
                  onChange={(e) => setMetodo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
                >
                  <option value="">Opcional</option>
                  {METODOS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Categoria */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Categoria (opcional)</label>
              <input
                type="text"
                placeholder="Aluguel, Produtos, Salário..."
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => { setModalOpen(false); resetModal(); }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Registrar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </>
  );
}
