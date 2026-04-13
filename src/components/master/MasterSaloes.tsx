"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Plus, Search, ChevronRight, XCircle, CheckCircle,
  Clock, DollarSign, Loader2, X, Store,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalonItem {
  id: string;
  name: string;
  city: string | null;
  active: boolean;
  createdAt: string;
  contratos: { id: string; valorMensal: number; ativo: boolean }[];
  owner: {
    id: string;
    name: string;
    email: string;
    blocked: boolean;
    trialExpires: string | null;
  };
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ owner }: { owner: SalonItem["owner"] }) {
  if (owner.blocked)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Bloqueado</span>;
  if (owner.trialExpires && new Date(owner.trialExpires) > new Date())
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Trial até {new Date(owner.trialExpires).toLocaleDateString("pt-BR")}</span>;
  if (!owner.trialExpires)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Trial expirado</span>;
}

export function MasterSaloes() {
  const qc = useQueryClient();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [contratoModal, setContratoModal] = useState<SalonItem | null>(null);
  const [contratoValor, setContratoValor] = useState("");
  const [contratoDia, setContratoDia] = useState("10");
  const [trialModal, setTrialModal] = useState<SalonItem | null>(null);
  const [trialDias, setTrialDias] = useState("30");

  const { data: saloes = [], isLoading } = useQuery<SalonItem[]>({
    queryKey: ["master-saloes"],
    queryFn: () => fetch("/api/master/saloes").then((r) => r.json()),
    staleTime: 30_000,
  });

  const filtered = saloes.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.name.toLowerCase().includes(search.toLowerCase()) ||
      s.owner.email.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleBlock(owner: SalonItem["owner"]) {
    setActionId(owner.id);
    try {
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: owner.id, blocked: !owner.blocked }),
      });
      if (!res.ok) throw new Error();
      toast.success(owner.blocked ? "Acesso liberado" : "Usuário bloqueado");
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setActionId(null);
    }
  }

  async function saveContrato() {
    if (!contratoModal || !contratoValor) return;
    setActionId("contrato");
    try {
      const res = await fetch("/api/master/contratos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: contratoModal.id,
          valorMensal: parseFloat(contratoValor.replace(",", ".")),
          diaVencimento: parseInt(contratoDia),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Contrato salvo");
      setContratoModal(null);
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao salvar contrato");
    } finally {
      setActionId(null);
    }
  }

  async function saveTrial() {
    if (!trialModal) return;
    setActionId("trial");
    try {
      const novaData = addDays(new Date(), parseInt(trialDias));
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: trialModal.owner.id, trialExpires: novaData.toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Trial estendido por ${trialDias} dias`);
      setTrialModal(null);
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao atualizar trial");
    } finally {
      setActionId(null);
    }
  }

  async function enterSalon(salonId: string) {
    await fetch("/api/saloes/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salonId }),
    });
    router.push("/dashboard");
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Salões</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{saloes.length} salão(ões) cadastrado(s)</p>
        </div>
        <a
          href="/master"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" />
          Cadastrar novo
        </a>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar salão, dono ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/50"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
        />
      </div>

      {/* List */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Store className="w-8 h-8 text-zinc-700" />
            <p className="text-zinc-600 text-sm">Nenhum salão encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((salon) => (
              <div key={salon.id} className="flex items-center gap-3 px-5 py-4">
                {/* Avatar */}
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                >
                  {salon.name.charAt(0).toUpperCase()}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-white text-sm font-bold truncate">{salon.name}</span>
                    <StatusBadge owner={salon.owner} />
                  </div>
                  <p className="text-zinc-600 text-xs mt-0.5 truncate">
                    {salon.owner.name} · {salon.owner.email}
                    {salon.city ? ` · ${salon.city}` : ""}
                    {" · "}
                    {formatDistanceToNow(new Date(salon.createdAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </div>

                {/* Contrato */}
                <div className="text-right flex-shrink-0 hidden md:block">
                  {salon.contratos[0] ? (
                    <p className="text-emerald-400 text-xs font-bold">
                      {fmt(Number(salon.contratos[0].valorMensal))}/mês
                    </p>
                  ) : (
                    <p className="text-zinc-600 text-xs">Sem contrato</p>
                  )}
                </div>

                {/* Ações */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Contrato */}
                  <button
                    title="Definir contrato"
                    onClick={() => { setContratoModal(salon); setContratoValor(salon.contratos[0] ? String(salon.contratos[0].valorMensal) : ""); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ background: "rgba(16,185,129,0.1)" }}
                  >
                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                  </button>
                  {/* Trial */}
                  <button
                    title="Estender trial"
                    onClick={() => { setTrialModal(salon); setTrialDias("30"); }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
                    style={{ background: "rgba(245,158,11,0.1)" }}
                  >
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </button>
                  {/* Block */}
                  <button
                    title={salon.owner.blocked ? "Desbloquear" : "Bloquear"}
                    disabled={actionId === salon.owner.id}
                    onClick={() => toggleBlock(salon.owner)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: salon.owner.blocked ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}
                  >
                    {salon.owner.blocked
                      ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                  </button>
                  {/* Enter */}
                  <button
                    title="Acessar este salão"
                    onClick={() => enterSalon(salon.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-violet-500/20"
                    style={{ background: "rgba(124,58,237,0.1)" }}
                  >
                    <ChevronRight className="w-3.5 h-3.5 text-violet-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Contrato */}
      {contratoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Contrato — {contratoModal.name}</p>
              <button onClick={() => setContratoModal(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Valor mensal (R$)</label>
                <input
                  type="number"
                  value={contratoValor}
                  onChange={(e) => setContratoValor(e.target.value)}
                  placeholder="99.90"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Dia de vencimento</label>
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={contratoDia}
                  onChange={(e) => setContratoDia(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                />
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={saveContrato}
                disabled={!contratoValor || actionId === "contrato"}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                {actionId === "contrato" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar contrato"}
              </button>
              <button onClick={() => setContratoModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Trial */}
      {trialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Estender trial — {trialModal.name}</p>
              <button onClick={() => setTrialModal(null)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-5 py-5">
              <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Dias a partir de hoje</label>
              <input
                type="number"
                value={trialDias}
                onChange={(e) => setTrialDias(e.target.value)}
                min={1}
                max={365}
                className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
              />
              <p className="text-zinc-600 text-xs mt-2">
                Nova expiração: {addDays(new Date(), parseInt(trialDias || "0")).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={saveTrial}
                disabled={actionId === "trial"}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                {actionId === "trial" ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar trial"}
              </button>
              <button onClick={() => setTrialModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
