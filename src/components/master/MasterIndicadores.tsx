"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, X, Loader2, Users, CheckCircle,
  Pencil, XCircle, ChevronDown, ChevronUp, Gift, Copy, Store, Link2,
} from "lucide-react";
import { toast } from "sonner";

interface Indicador {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  codigo: string;
  comissaoPorContrato: number;
  contratosBonus: number;
  observacao: string | null;
  ativo: boolean;
  createdAt: string;
  totalComissao: number;
  totalPendente: number;
  totalContratos: number;
  salons: { id: string; name: string }[];
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="p-1 text-zinc-600 hover:text-violet-400 transition-colors">
      {copied ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

const EMPTY = { nome: "", email: "", telefone: "", comissaoPorContrato: "50", contratosBonus: "2", observacao: "" };
const inp = "w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50";
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MasterIndicadores() {
  const qc = useQueryClient();
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Indicador | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addComissao, setAddComissao] = useState<{ id: string; descricao: string; valor: string; ehBonus: boolean; referencia: string } | null>(null);

  const { data: lista = [], isLoading } = useQuery<Indicador[]>({
    queryKey: ["master-indicadores"],
    queryFn: () => fetch("/api/master/indicadores").then((r) => r.json()),
    staleTime: 30_000,
  });

  function openCreate() { setForm(EMPTY); setModal("create"); }
  function openEdit(ind: Indicador) {
    setEditing(ind);
    setForm({
      nome: ind.nome, email: ind.email ?? "", telefone: ind.telefone ?? "",
      comissaoPorContrato: String(ind.comissaoPorContrato),
      contratosBonus: String(ind.contratosBonus),
      observacao: ind.observacao ?? "",
    });
    setModal("edit");
  }

  async function salvar() {
    if (!form.nome.trim()) return;
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(), email: form.email, telefone: form.telefone,
        comissaoPorContrato: parseFloat(form.comissaoPorContrato) || 50,
        contratosBonus: parseInt(form.contratosBonus) || 2,
        observacao: form.observacao,
        ...(modal === "edit" && { id: editing!.id }),
      };
      const res = await fetch("/api/master/indicadores", {
        method: modal === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro"); return; }
      toast.success(modal === "create" ? "Indicador cadastrado!" : "Atualizado!");
      setModal(null);
      qc.invalidateQueries({ queryKey: ["master-indicadores"] });
    } finally { setSaving(false); }
  }

  async function desativar(id: string) {
    await fetch(`/api/master/indicadores?id=${id}`, { method: "DELETE" });
    toast.success("Indicador desativado");
    qc.invalidateQueries({ queryKey: ["master-indicadores"] });
  }

  async function salvarComissao() {
    if (!addComissao) return;
    setSaving(true);
    try {
      const res = await fetch("/api/master/indicadores", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addComissao: {
            indicadorId: addComissao.id,
            descricao: addComissao.descricao,
            valor: parseFloat(addComissao.valor) || 0,
            ehBonus: addComissao.ehBonus,
            referencia: addComissao.referencia,
          },
        }),
      });
      if (!res.ok) { toast.error("Erro ao lançar comissão"); return; }
      toast.success("Comissão lançada!");
      setAddComissao(null);
      qc.invalidateQueries({ queryKey: ["master-indicadores"] });
    } finally { setSaving(false); }
  }

  async function pagarComissao(comissaoId: string) {
    await fetch("/api/master/indicadores", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ comissaoId }),
    });
    toast.success("Comissão marcada como paga");
    qc.invalidateQueries({ queryKey: ["master-indicadores"] });
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Indicadores</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Pessoas que indicam salões informalmente</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
          <Plus className="w-4 h-4" /> Cadastrar indicador
        </button>
      </div>

      {/* Como funciona */}
      <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
        <p className="text-violet-300 text-sm font-black mb-2">Como funciona</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { n: "1", t: "Cadastre a pessoa que indicou um salão" },
            { n: "2", t: "Configure o valor fixo por contrato e quantos contratos são bônus (100%)" },
            { n: "3", t: "Lance as comissões manualmente e pague — isso registra no financeiro" },
          ].map(({ n, t }) => (
            <div key={n} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>{n}</div>
              <p className="text-zinc-400 text-xs leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Users className="w-8 h-8 text-zinc-700" />
          <p className="text-zinc-600 text-sm">Nenhum indicador cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((ind) => (
            <div key={ind.id} className="rounded-2xl overflow-hidden"
              style={{ background: "#12102a", border: `1px solid ${ind.ativo ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.15)"}`, opacity: ind.ativo ? 1 : 0.6 }}>

              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-white font-black text-sm">{ind.nome}</p>
                    {!ind.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inativo</span>}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                      <Gift className="w-2.5 h-2.5 inline mr-0.5" />
                      {ind.contratosBonus} bônus
                    </span>
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5">{ind.email ?? ind.telefone ?? "—"}</p>
                </div>

                {/* Stats */}
                <div className="hidden sm:flex items-center gap-6 mr-4">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-600">Por contrato</p>
                    <p className="text-sm font-black text-violet-400">{fmt(Number(ind.comissaoPorContrato))}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-600">Total</p>
                    <p className="text-sm font-black text-white">{fmt(ind.totalComissao)}</p>
                  </div>
                  {ind.totalPendente > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600">Pendente</p>
                      <p className="text-sm font-black text-amber-400">{fmt(ind.totalPendente)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(ind)} title="Editar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/20 hover:bg-violet-500/30 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-violet-400" />
                  </button>
                  {ind.ativo && (
                    <button onClick={() => desativar(ind.id)} title="Desativar"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === ind.id ? null : ind.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    {expanded === ind.id ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                  </button>
                </div>
              </div>

              {/* Link de indicação — sempre visível */}
              <div className="px-5 py-3 border-t border-white/5">
                <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Link de indicação</p>
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg"
                  style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                  <Link2 className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  <code className="text-violet-300 text-xs flex-1 truncate">{baseUrl}/registro?ref={ind.codigo}</code>
                  <CopyBtn text={`${baseUrl}/registro?ref=${ind.codigo}`} />
                </div>
                <p className="text-zinc-700 text-[10px] mt-1">
                  Código: <span className="text-zinc-500 font-mono font-bold">{ind.codigo}</span>
                  {ind.salons.length > 0 && (
                    <span className="ml-2 text-emerald-600">· {ind.salons.length} salão(ões) convertido(s)</span>
                  )}
                </p>
              </div>

              {/* Salões convertidos */}
              {ind.salons.length > 0 && (
                <div className="px-5 pb-3 flex flex-wrap gap-2">
                  {ind.salons.map((s) => (
                    <span key={s.id} className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium bg-white/5 text-zinc-400">
                      <Store className="w-3 h-3 text-zinc-600" />{s.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Expanded: comissões */}
              {expanded === ind.id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Comissões</p>
                    <button onClick={() => setAddComissao({ id: ind.id, descricao: "", valor: String(ind.comissaoPorContrato), ehBonus: false, referencia: "" })}
                      className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300">
                      <Plus className="w-3 h-3" /> Lançar
                    </button>
                  </div>
                  {ind.totalContratos === 0 ? (
                    <p className="text-zinc-700 text-xs">Nenhuma comissão lançada</p>
                  ) : (
                    <ComissoesIndicadorList indicadorId={ind.id} onPagar={pagarComissao} />
                  )}
                </div>
              )}

              {/* Inline: add comissão */}
              {addComissao?.id === ind.id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-3 bg-violet-500/5">
                  <p className="text-xs font-bold text-violet-300">Lançar comissão</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Descrição (ex: Contrato #1 — Salão X)" value={addComissao.descricao}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, descricao: e.target.value }))} className={inp} />
                    <input type="number" placeholder="Valor R$" value={addComissao.valor}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, valor: e.target.value }))} className={inp} />
                    <input type="text" placeholder="Referência (ex: Abril/2026)" value={addComissao.referencia}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, referencia: e.target.value }))} className={inp} />
                    <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer">
                      <input type="checkbox" checked={addComissao.ehBonus}
                        onChange={(e) => setAddComissao((p) => p && ({ ...p, ehBonus: e.target.checked }))}
                        className="w-4 h-4 accent-violet-500" />
                      <span className="text-xs text-zinc-400">É contrato bônus</span>
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={salvarComissao} disabled={saving}
                      className="px-4 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                      {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : "Lançar"}
                    </button>
                    <button onClick={() => setAddComissao(null)} className="px-4 py-2 rounded-lg text-xs font-bold text-zinc-500">Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">{modal === "create" ? "Cadastrar indicador" : `Editar — ${editing?.nome}`}</p>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {[
                { label: "Nome *", key: "nome", type: "text", placeholder: "Maria Silva" },
                { label: "E-mail", key: "email", type: "email", placeholder: "maria@email.com" },
                { label: "WhatsApp", key: "telefone", type: "tel", placeholder: "11 99999-9999" },
                { label: "Observação", key: "observacao", type: "text", placeholder: "Como conheceu a plataforma..." },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder} className={inp} />
                </div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1">Comissão por contrato (R$)</label>
                  <input type="number" min="0" value={form.comissaoPorContrato}
                    onChange={(e) => setForm((f) => ({ ...f, comissaoPorContrato: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1">Contratos bônus</label>
                  <select value={form.contratosBonus}
                    onChange={(e) => setForm((f) => ({ ...f, contratosBonus: e.target.value }))}
                    className={inp}>
                    <option value="1">1 contrato</option>
                    <option value="2">2 contratos</option>
                    <option value="0">Nenhum</option>
                  </select>
                </div>
              </div>
              <p className="text-zinc-600 text-[11px]">
                Contratos bônus = primeiros N contratos pagam 100% ao indicador.
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={salvar} disabled={!form.nome || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : modal === "create" ? "Cadastrar" : "Salvar"}
              </button>
              <button onClick={() => setModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ComissoesIndicadorList({ indicadorId, onPagar }: { indicadorId: string; onPagar: (id: string) => void }) {
  const { data: ind } = useQuery<any>({
    queryKey: ["master-indicadores"],
    staleTime: 30_000,
  });
  const item = (ind as any[])?.find((i: any) => i.id === indicadorId);
  if (!item) return null;
  // Re-fetch full comissoes from the list (already included)
  return (
    <p className="text-zinc-600 text-xs">
      Total: {item.totalContratos} comissão(ões) · {item.totalPendente > 0 ? `R$ ${item.totalPendente.toFixed(2)} pendente` : "tudo pago"}
    </p>
  );
}
