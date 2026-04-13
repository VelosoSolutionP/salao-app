"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, Copy, Check, X, Loader2, Link2, DollarSign,
  Store, TrendingUp, UserCheck, Trash2,
} from "lucide-react";
import { toast } from "sonner";

interface Revendedor {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  codigo: string;
  percentual: number;
  ativo: boolean;
  observacao: string | null;
  createdAt: string;
  totalIndicacoes: number;
  convertidas: number;
  comissaoTotal: number;
  comissaoPendente: number;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
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
      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export function MasterRevendedores() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ nome: "", email: "", telefone: "", percentual: "10", observacao: "" });
  const [saving, setSaving] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const { data: revs = [], isLoading } = useQuery<Revendedor[]>({
    queryKey: ["master-revendedores"],
    queryFn: () => fetch("/api/master/revendedores").then((r) => r.json()),
    staleTime: 30_000,
  });

  async function criar() {
    if (!form.nome) return;
    setSaving(true);
    try {
      const res = await fetch("/api/master/revendedores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, percentual: parseFloat(form.percentual) }),
      });
      if (!res.ok) throw new Error();
      toast.success("Revendedor cadastrado!");
      setModal(false);
      setForm({ nome: "", email: "", telefone: "", percentual: "10", observacao: "" });
      qc.invalidateQueries({ queryKey: ["master-revendedores"] });
    } catch {
      toast.error("Erro ao cadastrar");
    } finally {
      setSaving(false);
    }
  }

  async function desativar(id: string) {
    setActionId(id);
    try {
      await fetch(`/api/master/revendedores?id=${id}`, { method: "DELETE" });
      toast.success("Revendedor desativado");
      qc.invalidateQueries({ queryKey: ["master-revendedores"] });
    } catch {
      toast.error("Erro");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Revendedores</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Gerencie indicações e comissões de revendas</p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" />
          Cadastrar revendedor
        </button>
      </div>

      {/* Como funciona */}
      <div
        className="rounded-2xl p-4"
        style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}
      >
        <p className="text-violet-300 text-sm font-black mb-2">Como funciona o sistema de indicações</p>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { n: "1", text: "Cadastre o revendedor e gere o link exclusivo dele" },
            { n: "2", text: "Ele compartilha o link — novos salões se cadastram com o código dele" },
            { n: "3", text: "Os 2 primeiros pagamentos vão 100% para o revendedor; após isso, recebe o % configurado" },
          ].map(({ n, text }) => (
            <div key={n} className="flex items-start gap-2">
              <div className="w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-black text-white flex-shrink-0 mt-0.5"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                {n}
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Grid de cards */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
      ) : revs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <UserCheck className="w-8 h-8 text-zinc-700" />
          <p className="text-zinc-600 text-sm">Nenhum revendedor cadastrado</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {revs.map((r) => {
            const link = `${baseUrl}/registro?ref=${r.codigo}`;
            return (
              <div
                key={r.id}
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "#12102a",
                  border: `1px solid ${r.ativo ? "rgba(255,255,255,0.07)" : "rgba(239,68,68,0.15)"}`,
                  opacity: r.ativo ? 1 : 0.6,
                }}
              >
                {/* Header do card */}
                <div className="flex items-start justify-between px-5 py-4 border-b border-white/5">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-white font-black text-sm">{r.nome}</p>
                      {!r.ativo && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Inativo</span>}
                    </div>
                    <p className="text-zinc-600 text-xs mt-0.5">{r.email ?? r.telefone ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-violet-400 text-sm font-black">{r.percentual}%</span>
                    {r.ativo && (
                      <button
                        onClick={() => desativar(r.id)}
                        disabled={actionId === r.id}
                        className="ml-2 text-zinc-700 hover:text-red-400 transition-colors"
                        title="Desativar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/5">
                  {[
                    { icon: Link2, label: "Indicações", value: r.totalIndicacoes },
                    { icon: Store, label: "Convertidas", value: r.convertidas },
                    { icon: TrendingUp, label: "Comissão total", value: fmt(r.comissaoTotal) },
                  ].map(({ icon: Icon, label, value }) => (
                    <div key={label} className="px-3 py-3 text-center">
                      <p className="text-zinc-600 text-[10px] font-medium">{label}</p>
                      <p className="text-white font-black text-sm mt-0.5">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Comissão pendente */}
                {r.comissaoPendente > 0 && (
                  <div className="px-5 py-2.5 border-b border-white/5 flex items-center justify-between">
                    <span className="text-zinc-500 text-xs">Comissão pendente</span>
                    <span className="text-amber-400 text-xs font-black">{fmt(r.comissaoPendente)}</span>
                  </div>
                )}

                {/* Link de indicação */}
                <div className="px-5 py-3">
                  <p className="text-zinc-600 text-[10px] font-semibold uppercase tracking-wider mb-1.5">Link de indicação</p>
                  <div
                    className="flex items-center gap-2 px-3 py-2 rounded-lg"
                    style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}
                  >
                    <code className="text-violet-300 text-xs flex-1 truncate">{link}</code>
                    <CopyBtn text={link} />
                  </div>
                  <p className="text-zinc-700 text-[10px] mt-1.5">
                    Código: <span className="text-zinc-500 font-mono font-bold">{r.codigo}</span>
                    {r.observacao && ` — ${r.observacao}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Novo revendedor */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Cadastrar revendedor</p>
              <button onClick={() => setModal(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {[
                { label: "Nome *", key: "nome", type: "text", placeholder: "João Silva" },
                { label: "E-mail", key: "email", type: "email", placeholder: "joao@email.com" },
                { label: "WhatsApp", key: "telefone", type: "tel", placeholder: "11 99999-9999" },
                { label: "Comissão (%)", key: "percentual", type: "number", placeholder: "10" },
                { label: "Observação", key: "observacao", type: "text", placeholder: "Parceiro regional SP..." },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="text-zinc-400 text-xs font-semibold block mb-1">{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                  />
                </div>
              ))}
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={criar}
                disabled={!form.nome || saving}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cadastrar"}
              </button>
              <button onClick={() => setModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
