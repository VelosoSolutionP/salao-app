"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Loader2, X, TrendingUp, TrendingDown, DollarSign, ExternalLink } from "lucide-react";
import { toast } from "sonner";

interface FinData {
  meses: { mes: string; receita: number; gastos: number; lucro: number }[];
  contratos: {
    id: string;
    valorMensal: number;
    diaVencimento: number;
    salon: { id: string; name: string; city: string | null };
  }[];
  gastos: { id: string; descricao: string; valor: number; categoria: string; data: string }[];
  resumoAno: { receita: number; gastos: number; lucro: number };
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const CATEGORIAS = ["Geral", "Hosting", "Ferramentas", "Marketing", "Pessoal", "Impostos", "Outros"];

export function MasterFinanceiro() {
  const qc = useQueryClient();
  const ano = new Date().getFullYear();
  const [gastoModal, setGastoModal] = useState(false);
  const [gastoForm, setGastoForm] = useState({ descricao: "", valor: "", categoria: "Geral", data: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery<FinData>({
    queryKey: ["master-financeiro", ano],
    queryFn: () => fetch(`/api/master/financeiro?ano=${ano}`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const maxVal = Math.max(...(data?.meses.map((m) => Math.max(m.receita, m.gastos)) ?? [1]), 1);

  async function addGasto() {
    if (!gastoForm.descricao || !gastoForm.valor) return;
    setSaving(true);
    try {
      const res = await fetch("/api/master/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...gastoForm, valor: parseFloat(gastoForm.valor.replace(",", ".")) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Gasto registrado");
      setGastoModal(false);
      setGastoForm({ descricao: "", valor: "", categoria: "Geral", data: new Date().toISOString().slice(0, 10) });
      qc.invalidateQueries({ queryKey: ["master-financeiro"] });
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function deleteGasto(id: string) {
    try {
      await fetch(`/api/master/gastos?id=${id}`, { method: "DELETE" });
      toast.success("Gasto removido");
      qc.invalidateQueries({ queryKey: ["master-financeiro"] });
    } catch {
      toast.error("Erro ao remover");
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Financeiro</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Controle de receitas e despesas da plataforma — {ano}</p>
        </div>
        <button
          onClick={() => setGastoModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" />
          Registrar gasto
        </button>
      </div>

      {/* Resumo ano */}
      {data && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: `Receita ${ano}`, value: fmt(data.resumoAno.receita), icon: TrendingUp, color: "#10b981" },
            { label: `Gastos ${ano}`, value: fmt(data.resumoAno.gastos), icon: TrendingDown, color: "#ef4444" },
            { label: "Lucro líquido", value: fmt(data.resumoAno.lucro), icon: DollarSign, color: data.resumoAno.lucro >= 0 ? "#10b981" : "#ef4444" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-4" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5" style={{ color }} />
                <p className="text-zinc-500 text-xs font-medium">{label}</p>
              </div>
              <p className="font-black text-xl" style={{ color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico mensal */}
      <div className="rounded-2xl p-5" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
        <p className="text-white font-black text-sm mb-5">Receita vs Gastos por mês</p>
        {isLoading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
        ) : (
          <div className="flex items-end gap-2 h-36">
            {data?.meses.map(({ mes, receita, gastos, lucro }) => (
              <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                <div className="flex items-end gap-0.5 w-full h-28">
                  <div
                    className="flex-1 rounded-t-sm transition-all"
                    style={{ height: `${(receita / maxVal) * 100}%`, background: "#10b981", minHeight: "2px" }}
                    title={`Receita: ${fmt(receita)}`}
                  />
                  <div
                    className="flex-1 rounded-t-sm transition-all"
                    style={{ height: `${(gastos / maxVal) * 100}%`, background: "#ef4444", minHeight: "2px" }}
                    title={`Gastos: ${fmt(gastos)}`}
                  />
                </div>
                <span className="text-[9px] text-zinc-600 font-medium">{mes}</span>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3">
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Receita</span>
          <span className="flex items-center gap-1.5 text-xs text-zinc-500"><span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Gastos</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Contratos ativos */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="px-5 py-4 text-white font-black text-sm border-b border-white/5">
            Contratos ativos ({data?.contratos.length ?? 0})
          </p>
          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
            {data?.contratos.map((c) => (
              <div key={c.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-white text-sm font-semibold">{c.salon.name}</p>
                  <p className="text-zinc-600 text-xs">{c.salon.city ?? "—"} · vence dia {c.diaVencimento}</p>
                </div>
                <p className="text-emerald-400 text-sm font-black">{fmt(Number(c.valorMensal))}/mês</p>
              </div>
            ))}
            {!data?.contratos.length && (
              <p className="px-5 py-8 text-center text-zinc-600 text-sm">Nenhum contrato ativo</p>
            )}
          </div>
        </div>

        {/* Gastos recentes */}
        <div className="rounded-2xl overflow-hidden" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="px-5 py-4 text-white font-black text-sm border-b border-white/5">Gastos registrados</p>
          <div className="divide-y divide-white/5 max-h-72 overflow-y-auto">
            {data?.gastos.map((g) => (
              <div key={g.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-white text-sm font-semibold">{g.descricao}</p>
                  <p className="text-zinc-600 text-xs">
                    {g.categoria} · {new Date(g.data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-red-400 text-sm font-black">{fmt(Number(g.valor))}</p>
                  <button
                    onClick={() => deleteGasto(g.id)}
                    className="text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {!data?.gastos.length && (
              <p className="px-5 py-8 text-center text-zinc-600 text-sm">Nenhum gasto registrado</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Novo gasto */}
      {gastoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Registrar gasto</p>
              <button onClick={() => setGastoModal(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {[
                { label: "Descrição", key: "descricao", type: "text", placeholder: "ex: Hosting Vercel" },
                { label: "Valor (R$)", key: "valor", type: "number", placeholder: "49.90" },
                { label: "Data", key: "data", type: "date", placeholder: "" },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={(gastoForm as any)[key]}
                    onChange={(e) => setGastoForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                  />
                </div>
              ))}
              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Categoria</label>
                <select
                  value={gastoForm.categoria}
                  onChange={(e) => setGastoForm((f) => ({ ...f, categoria: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={addGasto}
                disabled={!gastoForm.descricao || !gastoForm.valor || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar"}
              </button>
              <button onClick={() => setGastoModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Botão de teste Mercado Pago */}
      <TesteMP />
    </div>
  );
}

function TesteMP() {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);

  async function gerar() {
    setLoading(true);
    try {
      const res = await fetch("/api/master/teste-mp");
      const json = await res.json();
      setLink(json.link);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl p-4 mt-2" style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
      <p className="text-emerald-400 text-xs font-black mb-1">Teste de integração — Mercado Pago</p>
      <p className="text-zinc-500 text-xs mb-3">Gera um pagamento de R$1,00 para verificar se o dinheiro cai na sua conta.</p>
      {link ? (
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white w-fit"
          style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
        >
          <ExternalLink className="w-4 h-4" />
          Abrir link de pagamento R$1
        </a>
      ) : (
        <button
          onClick={gerar}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
          Gerar link de teste R$1
        </button>
      )}
    </div>
  );
}
