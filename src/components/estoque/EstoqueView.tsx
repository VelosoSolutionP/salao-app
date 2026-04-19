"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle, Plus, Package, Search, Pencil, Trash2,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, Loader2, BarChart2
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

const CATEGORIAS = ["Coloração", "Produto de Barba", "Capilar", "Pós-química", "Manutenção", "Equipamento", "Descartável", "Outro"];
const UNIDADES   = ["un", "ml", "g", "kg", "L", "cx"];

type MovTipo = "ENTRADA" | "SAIDA" | "AJUSTE";

const MOV_ICONS  = { ENTRADA: ArrowDownToLine, SAIDA: ArrowUpFromLine, AJUSTE: RefreshCw };
const MOV_LABELS = { ENTRADA: "Entrada", SAIDA: "Saída", AJUSTE: "Ajuste" };
const MOV_COLORS = { ENTRADA: "text-emerald-600 bg-emerald-50", SAIDA: "text-red-500 bg-red-50", AJUSTE: "text-blue-600 bg-blue-50" };

function StockBar({ value, min }: { value: number; min: number }) {
  const max   = Math.max(min * 3, value, 10);
  const pct   = Math.min((value / max) * 100, 100);
  const color = value <= 0 ? "bg-red-500" : value <= min ? "bg-amber-400" : "bg-emerald-400";
  return (
    <div className="flex items-center gap-2 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold tabular-nums ${value <= 0 ? "text-red-600" : value <= min ? "text-amber-600" : "text-emerald-600"}`}>
        {value}
      </span>
    </div>
  );
}

export function EstoqueView() {
  const qc = useQueryClient();
  const [search, setSearch]       = useState("");
  const [catFilter, setCatFilter] = useState("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [movModal, setMovModal]   = useState<{ id: string; nome: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<Record<string, string>>({});

  /* ── produto form state ── */
  const [pNome, setPNome]               = useState("");
  const [pCategoria, setPCategoria]     = useState("");
  const [pMarca, setPMarca]             = useState("");
  const [pUnidade, setPUnidade]         = useState("un");
  const [pPrecoCompra, setPPrecoCompra] = useState("");
  const [pPrecoVenda, setPPrecoVenda]   = useState("");
  const [pEstoque, setPEstoque]         = useState("0");
  const [pEstoqueMin, setPEstoqueMin]   = useState("5");

  /* ── movimento form state ── */
  const [movTipo, setMovTipo]         = useState<MovTipo>("ENTRADA");
  const [movQtd, setMovQtd]           = useState("1");
  const [movObs, setMovObs]           = useState("");
  const [movSubmitting, setMovSubmitting] = useState(false);
  const [movErrors, setMovErrors]     = useState<Record<string, string>>({});

  function resetProdutoForm() {
    setPNome(""); setPCategoria(""); setPMarca(""); setPUnidade("un");
    setPPrecoCompra(""); setPPrecoVenda(""); setPEstoque("0"); setPEstoqueMin("5");
    setFieldErrors({});
  }

  function resetMovForm() {
    setMovTipo("ENTRADA"); setMovQtd("1"); setMovObs(""); setMovErrors({});
  }

  const { data: produtos = [], isLoading } = useQuery<any[]>({
    queryKey: ["estoque"],
    queryFn: () => fetch("/api/estoque").then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => fetch(`/api/estoque/${id}`, { method: "DELETE" }).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
    onSuccess: () => { toast.success("Produto removido"); qc.invalidateQueries({ queryKey: ["estoque"] }); },
  });

  function openEdit(p: any) {
    setPNome(p.nome ?? "");
    setPCategoria(p.categoria ?? "");
    setPMarca(p.marca ?? "");
    setPUnidade(p.unidade ?? "un");
    setPPrecoCompra(p.precoCompra != null ? String(p.precoCompra) : "");
    setPPrecoVenda(p.precoVenda  != null ? String(p.precoVenda)  : "");
    setPEstoque(String(p.estoque ?? 0));
    setPEstoqueMin(String(p.estoqueMin ?? 5));
    setFieldErrors({});
    setEditingId(p.id);
    setModalOpen(true);
  }

  async function handleProdutoSubmit() {
    const errs: Record<string, string> = {};
    if (!pNome.trim()) errs.nome = "Nome obrigatório";
    if (!pUnidade.trim()) errs.unidade = "Obrigatório";
    const estoqueNum    = parseInt(pEstoque);
    const estoqueMinNum = parseInt(pEstoqueMin);
    if (isNaN(estoqueNum)    || estoqueNum < 0)    errs.estoque    = "Deve ser ≥ 0";
    if (isNaN(estoqueMinNum) || estoqueMinNum < 0) errs.estoqueMin = "Deve ser ≥ 0";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    const precoCompra = pPrecoCompra ? parseFloat(pPrecoCompra) : undefined;
    const precoVenda  = pPrecoVenda  ? parseFloat(pPrecoVenda)  : undefined;

    setSubmitting(true);
    try {
      const url    = editingId ? `/api/estoque/${editingId}` : "/api/estoque";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:      pNome.trim(),
          categoria: pCategoria || undefined,
          marca:     pMarca || undefined,
          unidade:   pUnidade,
          precoCompra,
          precoVenda,
          estoque:    estoqueNum,
          estoqueMin: estoqueMinNum,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(data.error ?? "Erro ao salvar"); return; }
      toast.success(editingId ? "Produto atualizado!" : "Produto criado!");
      qc.invalidateQueries({ queryKey: ["estoque"] });
      setModalOpen(false);
      setEditingId(null);
      resetProdutoForm();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMovimento() {
    const errs: Record<string, string> = {};
    const qtd = parseInt(movQtd);
    if (isNaN(qtd) || qtd <= 0) errs.quantidade = "Deve ser maior que 0";
    if (Object.keys(errs).length > 0) { setMovErrors(errs); return; }

    setMovSubmitting(true);
    try {
      const res = await fetch(`/api/estoque/${movModal!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ movimento: { tipo: movTipo, quantidade: qtd, observacao: movObs || undefined } }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(data.error ?? "Erro ao movimentar"); return; }
      toast.success("Estoque atualizado!");
      qc.invalidateQueries({ queryKey: ["estoque"] });
      setMovModal(null);
      resetMovForm();
    } catch {
      toast.error("Erro ao movimentar");
    } finally {
      setMovSubmitting(false);
    }
  }

  const filtered    = produtos.filter((p) => {
    const matchSearch = p.nome.toLowerCase().includes(search.toLowerCase()) || (p.marca ?? "").toLowerCase().includes(search.toLowerCase());
    const matchCat    = catFilter === "all" || p.categoria === catFilter;
    return matchSearch && matchCat;
  });

  const baixoEstoque = produtos.filter((p) => p.estoque <= p.estoqueMin);
  const semEstoque   = produtos.filter((p) => p.estoque === 0);
  const categorias   = [...new Set(produtos.map((p: any) => p.categoria).filter(Boolean))];

  return (
    <>
      {/* Alert banner */}
      {baixoEstoque.length > 0 && (
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-amber-800">
              {semEstoque.length > 0 ? `${semEstoque.length} produto(s) zerado(s), ` : ""}
              {baixoEstoque.length} produto(s) abaixo do mínimo
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              {baixoEstoque.slice(0, 4).map((p: any) => p.nome).join(", ")}
              {baixoEstoque.length > 4 ? ` e mais ${baixoEstoque.length - 4}...` : ""}
            </p>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {[
          { label: "Total de produtos", value: produtos.length,                                              color: "text-violet-600", bg: "bg-violet-50" },
          { label: "Estoque normal",    value: produtos.filter((p: any) => p.estoque > p.estoqueMin).length, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Estoque baixo",     value: baixoEstoque.length,                                          color: "text-amber-600",  bg: "bg-amber-50"  },
          { label: "Sem estoque",       value: semEstoque.length,                                            color: "text-red-600",    bg: "bg-red-50"    },
        ].map((c) => (
          <div key={c.label} className="bg-white rounded-2xl p-4 ring-1 ring-gray-100">
            <p className={`text-2xl font-black ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5 font-medium">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input placeholder="Buscar produto ou marca..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 h-10 rounded-xl" />
        </div>
        <select
          value={catFilter}
          onChange={(e) => setCatFilter(e.target.value)}
          className="h-10 px-3 rounded-xl border border-input bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-violet-500 min-w-[160px]"
        >
          <option value="all">Todas categorias</option>
          {categorias.map((c: any) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button
          onClick={() => { setEditingId(null); resetProdutoForm(); setModalOpen(true); }}
          className="h-10 rounded-xl bg-violet-600 hover:bg-violet-700 shadow-sm"
        >
          <Plus className="w-4 h-4 mr-2" /> Novo produto
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl ring-1 ring-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center py-16"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
              <Package className="w-7 h-7 text-gray-300" />
            </div>
            <p className="text-sm font-semibold text-gray-500">Nenhum produto encontrado</p>
            <p className="text-xs text-gray-400 mt-1">Adicione produtos ao seu estoque</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/50">
                  <th className="text-left px-5 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Produto</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden md:table-cell">Categoria</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Preço venda</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider">Estoque</th>
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider hidden sm:table-cell">Status</th>
                  <th className="px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((p: any) => {
                  const baixo = p.estoque <= p.estoqueMin;
                  const zero  = p.estoque === 0;
                  return (
                    <tr key={p.id} className="hover:bg-gray-50/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${zero ? "bg-red-50" : baixo ? "bg-amber-50" : "bg-violet-50"}`}>
                            <Package className={`w-4 h-4 ${zero ? "text-red-400" : baixo ? "text-amber-400" : "text-violet-400"}`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-tight">{p.nome}</p>
                            {p.marca && <p className="text-xs text-gray-400">{p.marca} · {p.unidade}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 hidden md:table-cell">
                        {p.categoria ? (
                          <span className="text-xs bg-gray-100 text-gray-600 font-medium px-2.5 py-1 rounded-full">{p.categoria}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5 hidden lg:table-cell font-semibold text-gray-700">
                        {p.precoVenda ? formatBRL(p.precoVenda) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3.5">
                        <StockBar value={p.estoque} min={p.estoqueMin} />
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        {zero ? (
                          <Badge className="bg-red-100 text-red-700 border-0 text-xs font-semibold">Zerado</Badge>
                        ) : baixo ? (
                          <Badge className="bg-amber-100 text-amber-700 border-0 text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3 mr-1" />Baixo
                          </Badge>
                        ) : (
                          <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs font-semibold">OK</Badge>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => { setMovModal({ id: p.id, nome: p.nome }); resetMovForm(); }}
                            className="p-2 rounded-lg hover:bg-emerald-50 text-emerald-500 hover:text-emerald-600 transition-colors"
                            title="Movimentar estoque"
                          >
                            <BarChart2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => openEdit(p)} className="p-2 rounded-lg hover:bg-violet-50 text-gray-400 hover:text-violet-600 transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => deleteMutation.mutate(p.id)} className="p-2 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Produto Modal */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setEditingId(null); resetProdutoForm(); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-black">{editingId ? "Editar produto" : "Novo produto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome do produto</label>
              <input
                type="text"
                placeholder="Ex: Tinta Louro Claro 7.0"
                value={pNome}
                onChange={(e) => { setPNome(e.target.value); setFieldErrors((er) => ({ ...er, nome: "" })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {fieldErrors.nome && <p className="text-xs text-red-500 mt-1">{fieldErrors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Categoria</label>
                <select
                  value={pCategoria}
                  onChange={(e) => setPCategoria(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  <option value="">Selecionar</option>
                  {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Marca</label>
                <input
                  type="text"
                  placeholder="Ex: L'Oréal"
                  value={pMarca}
                  onChange={(e) => setPMarca(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Qtd atual</label>
                <input
                  type="number"
                  min="0"
                  value={pEstoque}
                  onChange={(e) => { setPEstoque(e.target.value); setFieldErrors((er) => ({ ...er, estoque: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                {fieldErrors.estoque && <p className="text-xs text-red-500 mt-1">{fieldErrors.estoque}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Mínimo</label>
                <input
                  type="number"
                  min="0"
                  value={pEstoqueMin}
                  onChange={(e) => { setPEstoqueMin(e.target.value); setFieldErrors((er) => ({ ...er, estoqueMin: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Unidade</label>
                <select
                  value={pUnidade}
                  onChange={(e) => setPUnidade(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
                >
                  {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Preço custo (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={pPrecoCompra}
                  onChange={(e) => setPPrecoCompra(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Preço venda (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0,00"
                  value={pPrecoVenda}
                  onChange={(e) => setPPrecoVenda(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setModalOpen(false); setEditingId(null); resetProdutoForm(); }}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700" disabled={submitting} onClick={handleProdutoSubmit}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Salvar" : "Criar produto"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Movimento Modal */}
      <Dialog open={!!movModal} onOpenChange={(o) => { if (!o) { setMovModal(null); resetMovForm(); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-black">Movimentar Estoque</DialogTitle>
          </DialogHeader>
          {movModal && (
            <div className="space-y-4">
              <p className="text-sm text-gray-500">Produto: <span className="font-semibold text-gray-800">{movModal.nome}</span></p>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {(["ENTRADA", "SAIDA", "AJUSTE"] as const).map((t) => {
                    const Icon = MOV_ICONS[t];
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setMovTipo(t)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-xs font-semibold ${movTipo === t ? `border-current ${MOV_COLORS[t]}` : "border-gray-200 text-gray-400 hover:border-gray-300"}`}
                      >
                        <Icon className="w-5 h-5" />
                        {MOV_LABELS[t]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Quantidade</label>
                <input
                  type="number"
                  min="1"
                  value={movQtd}
                  onChange={(e) => { setMovQtd(e.target.value); setMovErrors((er) => ({ ...er, quantidade: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm text-center text-lg font-bold h-12 focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                {movErrors.quantidade && <p className="text-xs text-red-500 mt-1">{movErrors.quantidade}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Observação (opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: Compra fornecedor X"
                  value={movObs}
                  onChange={(e) => setMovObs(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
              </div>

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1 rounded-xl" onClick={() => { setMovModal(null); resetMovForm(); }}>
                  Cancelar
                </Button>
                <Button type="button" className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700" disabled={movSubmitting} onClick={handleMovimento}>
                  {movSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
