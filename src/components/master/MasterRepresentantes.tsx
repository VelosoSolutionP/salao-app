"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, X, Loader2, MapPin, Store, DollarSign,
  Pencil, XCircle, ChevronDown, ChevronUp, AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface Representante {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  regiao: string;
  percentual: number;
  observacao: string | null;
  ativo: boolean;
  createdAt: string;
  totalSaloes: number;
  totalComissao: number;
  totalPendente: number;
  salons: { id: string; name: string; city: string | null }[];
}

const EMPTY = { nome: "", email: "", telefone: "", regiao: "", percentual: "10", observacao: "" };
const inp = "w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50";
const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function MasterRepresentantes() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<"create" | "edit" | null>(null);
  const [editing, setEditing] = useState<Representante | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [addComissao, setAddComissao] = useState<{ id: string; descricao: string; valor: string; referencia: string } | null>(null);
  const [conflictWarn, setConflictWarn] = useState<string | null>(null);

  const { data: lista = [], isLoading } = useQuery<Representante[]>({
    queryKey: ["master-representantes"],
    queryFn: () => fetch("/api/master/representantes").then((r) => r.json()),
    staleTime: 30_000,
  });

  // Group by region for conflict visualization
  const regioes = [...new Set(lista.filter((r) => r.ativo).map((r) => r.regiao))].sort();

  function openCreate() { setForm(EMPTY); setConflictWarn(null); setModal("create"); }
  function openEdit(rep: Representante) {
    setEditing(rep);
    setForm({ nome: rep.nome, email: rep.email ?? "", telefone: rep.telefone ?? "", regiao: rep.regiao, percentual: String(rep.percentual), observacao: rep.observacao ?? "" });
    setConflictWarn(null);
    setModal("edit");
  }

  async function salvar() {
    if (!form.nome.trim() || !form.regiao.trim()) { toast.error("Nome e região são obrigatórios"); return; }
    setSaving(true);
    try {
      const payload = {
        nome: form.nome.trim(), email: form.email, telefone: form.telefone,
        regiao: form.regiao.trim(), percentual: parseFloat(form.percentual) || 10,
        observacao: form.observacao,
        ...(modal === "edit" && { id: editing!.id }),
      };
      const res = await fetch("/api/master/representantes", {
        method: modal === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.status === 409 && json.conflict) { setConflictWarn(json.error); return; }
      if (!res.ok) { toast.error(json.error ?? "Erro"); return; }
      toast.success(modal === "create" ? "Representante cadastrado!" : "Atualizado!");
      setModal(null);
      qc.invalidateQueries({ queryKey: ["master-representantes"] });
    } finally { setSaving(false); }
  }

  async function desativar(id: string) {
    await fetch(`/api/master/representantes?id=${id}`, { method: "DELETE" });
    toast.success("Representante desativado");
    qc.invalidateQueries({ queryKey: ["master-representantes"] });
  }

  async function salvarComissao() {
    if (!addComissao) return;
    setSaving(true);
    try {
      const res = await fetch("/api/master/representantes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          addComissao: {
            representanteId: addComissao.id,
            descricao: addComissao.descricao,
            valor: parseFloat(addComissao.valor) || 0,
            referencia: addComissao.referencia,
          },
        }),
      });
      if (!res.ok) { toast.error("Erro ao lançar comissão"); return; }
      toast.success("Comissão lançada!");
      setAddComissao(null);
      qc.invalidateQueries({ queryKey: ["master-representantes"] });
    } finally { setSaving(false); }
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Representantes</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Regiões exclusivas para evitar conflitos</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}>
          <Plus className="w-4 h-4" /> Cadastrar representante
        </button>
      </div>

      {/* Mapa de regiões */}
      {regioes.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
          <p className="text-violet-300 text-xs font-black uppercase tracking-wider mb-3">Regiões ativas</p>
          <div className="flex flex-wrap gap-2">
            {regioes.map((reg) => {
              const rep = lista.find((r) => r.regiao === reg && r.ativo);
              return (
                <div key={reg} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
                  style={{ background: "rgba(124,58,237,0.2)", border: "1px solid rgba(124,58,237,0.3)", color: "#c4b5fd" }}>
                  <MapPin className="w-3 h-3" />
                  {reg}
                  <span className="text-violet-500">— {rep?.nome}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <MapPin className="w-8 h-8 text-zinc-700" />
          <p className="text-zinc-600 text-sm">Nenhum representante cadastrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((rep) => (
            <div key={rep.id} className="rounded-2xl overflow-hidden"
              style={{ background: "#12102a", border: `1px solid ${rep.ativo ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.15)"}`, opacity: rep.ativo ? 1 : 0.6 }}>

              <div className="flex items-center justify-between px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white font-black text-sm">{rep.nome}</p>
                    <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300">
                      <MapPin className="w-2.5 h-2.5" />{rep.regiao}
                    </span>
                    {!rep.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inativo</span>}
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5">{rep.email ?? rep.telefone ?? "—"}</p>
                </div>

                <div className="hidden sm:flex items-center gap-6 mr-4">
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-600">Comissão</p>
                    <p className="text-sm font-black text-violet-400">{Number(rep.percentual)}%</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-zinc-600">Salões</p>
                    <p className="text-sm font-black text-white">{rep.totalSaloes}</p>
                  </div>
                  {rep.totalPendente > 0 && (
                    <div className="text-center">
                      <p className="text-[10px] text-zinc-600">Pendente</p>
                      <p className="text-sm font-black text-amber-400">{fmt(rep.totalPendente)}</p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button onClick={() => openEdit(rep)} title="Editar"
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-500/20 hover:bg-violet-500/30 transition-colors">
                    <Pencil className="w-3.5 h-3.5 text-violet-400" />
                  </button>
                  {rep.ativo && (
                    <button onClick={() => desativar(rep.id)} title="Desativar"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 hover:bg-red-500/20 transition-colors">
                      <XCircle className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  )}
                  <button onClick={() => setExpanded(expanded === rep.id ? null : rep.id)}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                    {expanded === rep.id ? <ChevronUp className="w-3.5 h-3.5 text-zinc-400" /> : <ChevronDown className="w-3.5 h-3.5 text-zinc-400" />}
                  </button>
                </div>
              </div>

              {/* Expanded */}
              {expanded === rep.id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-4">
                  {/* Salões na região */}
                  {rep.salons.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2">Salões na região</p>
                      <div className="flex flex-wrap gap-2">
                        {rep.salons.map((s) => (
                          <span key={s.id} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-white/5 text-zinc-300">
                            <Store className="w-3 h-3 text-zinc-500" />{s.name}{s.city ? ` — ${s.city}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Comissões */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Comissões</p>
                      <button onClick={() => setAddComissao({ id: rep.id, descricao: "", valor: "", referencia: "" })}
                        className="flex items-center gap-1 text-xs font-bold text-violet-400 hover:text-violet-300">
                        <Plus className="w-3 h-3" /> Lançar
                      </button>
                    </div>
                    <p className="text-zinc-600 text-xs">
                      Total: {fmt(rep.totalComissao)}
                      {rep.totalPendente > 0 && <span className="text-amber-400 ml-2">· {fmt(rep.totalPendente)} pendente</span>}
                    </p>
                  </div>

                  {rep.observacao && (
                    <p className="text-zinc-600 text-xs italic">"{rep.observacao}"</p>
                  )}
                </div>
              )}

              {/* Add comissão inline */}
              {addComissao?.id === rep.id && (
                <div className="border-t border-white/5 px-5 py-4 space-y-3 bg-violet-500/5">
                  <p className="text-xs font-bold text-violet-300">Lançar comissão</p>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Descrição" value={addComissao.descricao}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, descricao: e.target.value }))} className={inp} />
                    <input type="number" placeholder="Valor R$" value={addComissao.valor}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, valor: e.target.value }))} className={inp} />
                    <input type="text" placeholder="Referência (ex: Abril/2026)" value={addComissao.referencia}
                      onChange={(e) => setAddComissao((p) => p && ({ ...p, referencia: e.target.value }))}
                      className={`${inp} col-span-2`} />
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
              <p className="text-white font-black text-sm">{modal === "create" ? "Cadastrar representante" : `Editar — ${editing?.nome}`}</p>
              <button onClick={() => setModal(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {conflictWarn && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                  <p className="text-amber-300 text-xs">{conflictWarn}</p>
                </div>
              )}
              {[
                { label: "Nome *", key: "nome", type: "text", placeholder: "Carlos Souza" },
                { label: "Região * (exclusiva)", key: "regiao", type: "text", placeholder: "SP Capital, RJ, Sul..." },
                { label: "E-mail", key: "email", type: "email", placeholder: "carlos@email.com" },
                { label: "WhatsApp", key: "telefone", type: "tel", placeholder: "11 99999-9999" },
                { label: "Comissão (%)", key: "percentual", type: "number", placeholder: "10" },
                { label: "Observação", key: "observacao", type: "text", placeholder: "Parceiro desde 2025..." },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1">{label}</label>
                  <input type={type} value={(form as any)[key]}
                    onChange={(e) => { setConflictWarn(null); setForm((f) => ({ ...f, [key]: e.target.value })); }}
                    placeholder={placeholder} className={inp} />
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button onClick={salvar} disabled={!form.nome || !form.regiao || saving}
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
