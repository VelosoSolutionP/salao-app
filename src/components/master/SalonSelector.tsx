"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scissors, Plus, ArrowRight, Loader2, Building2, Check } from "lucide-react";

interface SalonItem {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  active: boolean;
  _count?: { agendamentos: number; colaboradores: number };
}

export function SalonSelector() {
  const router = useRouter();
  const [selecting, setSelecting] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCity, setNewCity] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: salons = [], isLoading, refetch } = useQuery<SalonItem[]>({
    queryKey: ["master-salons"],
    queryFn: () => fetch("/api/saloes").then((r) => r.json()),
    staleTime: 0,
  });

  async function selectSalon(salonId: string, salonName: string) {
    setSelecting(salonId);
    try {
      const res = await fetch("/api/saloes/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId }),
      });
      if (!res.ok) throw new Error("Erro ao selecionar salão");
      toast.success(`Entrando em: ${salonName}`);
      router.push("/dashboard");
    } catch {
      toast.error("Erro ao selecionar salão");
      setSelecting(null);
    }
  }

  async function createSalon() {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/saloes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), city: newCity.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar salão");
      toast.success(`Salão "${data.name}" criado!`);
      await refetch();
      setCreating(false);
      setNewName("");
      setNewCity("");
      await selectSalon(data.id, data.name);
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar salão");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(155deg,#0e0b1a 0%,#1a1040 55%,#0c0a18 100%)" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-8 py-6">
        <div
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
            boxShadow: "0 0 0 1px rgba(124,58,237,.3),0 4px 20px rgba(124,58,237,.45)",
          }}
        >
          <Scissors className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white font-black text-sm leading-tight">MSB Solution</p>
          <p className="text-violet-400/60 text-[10px] font-semibold tracking-widest uppercase">Painel Master</p>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">

          {/* Title */}
          <div className="text-center mb-10">
            <p className="text-[11px] font-black uppercase tracking-widest text-violet-400 mb-3">Acesso Master</p>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Qual salão deseja gerenciar?
            </h1>
            <p className="text-zinc-500 mt-2 text-sm">
              Selecione um salão para entrar no painel de gestão.
            </p>
          </div>

          {/* Salons grid */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {salons.map((s) => (
                <button
                  key={s.id}
                  onClick={() => selectSalon(s.id, s.name)}
                  disabled={!!selecting}
                  className="group relative text-left rounded-2xl p-5 transition-all duration-200 disabled:opacity-60"
                  style={{
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.08)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(124,58,237,0.12)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.04)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)";
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                    >
                      {s.name.charAt(0).toUpperCase()}
                    </div>
                    {selecting === s.id ? (
                      <Loader2 className="w-4 h-4 text-violet-400 animate-spin mt-1 flex-shrink-0" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-violet-400 transition-colors mt-1 flex-shrink-0" />
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-white font-bold text-base leading-tight">{s.name}</p>
                    {s.city && (
                      <p className="text-zinc-500 text-xs mt-1">{s.city}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.active ? "bg-emerald-400" : "bg-zinc-600"}`}
                      />
                      <span className="text-[10px] text-zinc-500 font-semibold">
                        {s.active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                  </div>
                </button>
              ))}

              {/* Create new salon card */}
              {!creating ? (
                <button
                  onClick={() => setCreating(true)}
                  className="group text-left rounded-2xl p-5 transition-all duration-200"
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    border: "1px dashed rgba(255,255,255,0.12)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(124,58,237,0.4)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                    >
                      <Plus className="w-5 h-5 text-zinc-600 group-hover:text-violet-400 transition-colors" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-zinc-400 font-bold text-base group-hover:text-violet-300 transition-colors">
                      Cadastrar novo salão
                    </p>
                    <p className="text-zinc-600 text-xs mt-1">Clique para criar e entrar</p>
                  </div>
                </button>
              ) : (
                <div
                  className="rounded-2xl p-5 space-y-3"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.3)",
                  }}
                >
                  <p className="text-white font-bold text-sm">Novo salão</p>
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createSalon(); if (e.key === "Escape") setCreating(false); }}
                    placeholder="Nome do salão *"
                    className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-violet-500/50"
                  />
                  <input
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createSalon(); }}
                    placeholder="Cidade (opcional)"
                    className="w-full text-sm bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:border-violet-500/50"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={createSalon}
                      disabled={!newName.trim() || saving}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Check className="w-4 h-4" /> Criar e entrar</>}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewName(""); setNewCity(""); }}
                      className="px-4 py-2.5 rounded-xl text-sm font-semibold text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {salons.length === 0 && !isLoading && (
            <p className="text-center text-zinc-600 text-sm mt-4">
              Nenhum salão cadastrado ainda. Crie o primeiro acima.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
