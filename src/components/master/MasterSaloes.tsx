"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Plus, Search, XCircle, CheckCircle,
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

const novoSalonDefault = { salonName: "", name: "", email: "", phone: "", password: "" };

export function MasterSaloes() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [contratoModal, setContratoModal] = useState<SalonItem | null>(null);
  const [contratoValor, setContratoValor] = useState("");
  const [contratoDia, setContratoDia] = useState("10");
  const [trialModal, setTrialModal] = useState<SalonItem | null>(null);
  const [trialDias, setTrialDias] = useState("30");
  const [novoModal, setNovoModal] = useState(false);
  const [novoForm, setNovoForm] = useState(novoSalonDefault);
  const [novoSaving, setNovoSaving] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

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

  async function criarSalon() {
    const { salonName, name, email, password } = novoForm;
    if (!salonName || !name || !email) return;
    const senha = password || Math.random().toString(36).slice(-10) + "A1!";
    setNovoSaving(true);
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonName, name, email, phone: novoForm.phone, password: senha, role: "OWNER" }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao cadastrar salão");
        return;
      }
      toast.success("Salão cadastrado!");
      if (!password) setSenhaGerada(senha);
      else {
        setNovoModal(false);
        setNovoForm(novoSalonDefault);
      }
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao cadastrar salão");
    } finally {
      setNovoSaving(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Salões</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{saloes.length} salão(ões) cadastrado(s)</p>
        </div>
        <button
          onClick={() => { setNovoModal(true); setNovoForm(novoSalonDefault); setSenhaGerada(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" />
          Cadastrar novo
        </button>
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
              <div key={salon.id} className="px-4 py-4 space-y-3">
                {/* Row 1: avatar + info */}
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm flex-shrink-0"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                  >
                    {salon.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-bold">{salon.name}</span>
                      <StatusBadge owner={salon.owner} />
                    </div>
                    <p className="text-zinc-600 text-xs mt-0.5 truncate">
                      {salon.owner.name} · {salon.city ?? "—"}
                    </p>
                    <p className="text-zinc-700 text-xs truncate">{salon.owner.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs font-bold ${salon.contratos[0] ? "text-emerald-400" : "text-zinc-600"}`}>
                      {salon.contratos[0] ? `${fmt(Number(salon.contratos[0].valorMensal))}/mês` : "Sem contrato"}
                    </p>
                    <p className="text-zinc-700 text-[10px] mt-0.5">
                      {formatDistanceToNow(new Date(salon.createdAt), { addSuffix: true, locale: ptBR })}
                    </p>
                  </div>
                </div>

                {/* Row 2: action buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => { setContratoModal(salon); setContratoValor(salon.contratos[0] ? String(salon.contratos[0].valorMensal) : ""); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}
                  >
                    <DollarSign className="w-3 h-3" /> Contrato
                  </button>
                  <button
                    onClick={() => { setTrialModal(salon); setTrialDias("30"); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                  >
                    <Clock className="w-3 h-3" /> Trial
                  </button>
                  <button
                    disabled={actionId === salon.owner.id}
                    onClick={() => toggleBlock(salon.owner)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={salon.owner.blocked
                      ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                      : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                  >
                    {actionId === salon.owner.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : salon.owner.blocked
                        ? <><CheckCircle className="w-3 h-3" /> Liberar</>
                        : <><XCircle className="w-3 h-3" /> Bloquear</>}
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

      {/* Modal: Novo salão */}
      {novoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Cadastrar novo salão</p>
              <button onClick={() => setNovoModal(false)} className="text-zinc-500 hover:text-zinc-300"><X className="w-4 h-4" /></button>
            </div>

            {senhaGerada ? (
              <div className="px-5 py-6 space-y-4">
                <p className="text-green-400 text-sm font-bold">Salão cadastrado com sucesso!</p>
                <div>
                  <p className="text-zinc-400 text-xs mb-1.5">Senha gerada automaticamente — anote e repasse ao proprietário:</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <code className="text-violet-300 text-sm font-mono flex-1">{senhaGerada}</code>
                  </div>
                </div>
                <button
                  onClick={() => { setNovoModal(false); setNovoForm(novoSalonDefault); setSenhaGerada(null); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div className="px-5 py-5 space-y-3">
                  {[
                    { label: "Nome do salão *", key: "salonName", type: "text", placeholder: "Barbearia do João" },
                    { label: "Nome do proprietário *", key: "name", type: "text", placeholder: "João Silva" },
                    { label: "E-mail *", key: "email", type: "email", placeholder: "joao@email.com" },
                    { label: "WhatsApp", key: "phone", type: "tel", placeholder: "(11) 99999-9999" },
                    { label: "Senha (deixe vazio para gerar)", key: "password", type: "password", placeholder: "••••••" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className="text-zinc-400 text-xs font-semibold block mb-1">{label}</label>
                      <input
                        type={type}
                        value={(novoForm as any)[key]}
                        onChange={(e) => setNovoForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                      />
                    </div>
                  ))}
                </div>
                <div className="px-5 pb-5 flex gap-2">
                  <button
                    onClick={criarSalon}
                    disabled={!novoForm.salonName || !novoForm.name || !novoForm.email || novoSaving}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                  >
                    {novoSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Cadastrar"}
                  </button>
                  <button onClick={() => setNovoModal(false)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
