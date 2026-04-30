"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { upload } from "@vercel/blob/client";
import {
  Plus, Search, XCircle, CheckCircle, Clock, DollarSign,
  Loader2, X, Store, Pencil, ImageIcon, Users, UserPlus,
  KeyRound, Trash2, Eye, EyeOff, Save,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface SalonItem {
  id: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  active: boolean;
  createdAt: string;
  contratos: { id: string; valorMensal: number; ativo: boolean; diaVencimento: number; plano: string }[];
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    blocked: boolean;
    trialExpires: string | null;
  };
}

interface SalonUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  blocked: boolean;
  role: string;
  createdAt?: string;
}

interface SalonUsersData {
  salon: { id: string; name: string };
  owner: SalonUser;
  barbers: { id: string; active: boolean; user: SalonUser }[];
  plano: string;
  maxFuncionarios: number | null;
  totalBarbers: number;
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ owner, temContrato }: { owner: SalonItem["owner"]; temContrato: boolean }) {
  if (owner.blocked)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Bloqueado</span>;
  if (temContrato)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>;
  if (owner.trialExpires && new Date(owner.trialExpires) > new Date())
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Trial até {new Date(owner.trialExpires).toLocaleDateString("pt-BR")}</span>;
  if (!owner.trialExpires)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Trial expirado</span>;
}

function PlanoBadge({ plano }: { plano: string }) {
  const info = { BASICO: { label: "Básico", cor: "#6366f1" }, PRATA: { label: "Prata", cor: "#94a3b8" }, OURO: { label: "Ouro", cor: "#d97706" } }[plano] ?? { label: plano, cor: "#6366f1" };
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${info.cor}22`, color: info.cor }}>
      {info.label}
    </span>
  );
}

const fieldClass = "w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50 placeholder-zinc-600";
const labelClass = "text-zinc-400 text-xs font-semibold block mb-1";

const novoDefault = {
  salonName: "", name: "", email: "", phone: "",
  comContrato: false, contratoValor: "", contratoDia: "10", contratoPlano: "BASICO" as "BASICO" | "PRATA" | "OURO",
};

export function MasterSaloes() {
  const qc = useQueryClient();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  // Contrato modal
  const [contratoModal, setContratoModal] = useState<SalonItem | null>(null);
  const [contratoValor, setContratoValor] = useState("");
  const [contratoDia, setContratoDia] = useState("10");
  const [contratoPlano, setContratoPlano] = useState<"BASICO" | "PRATA" | "OURO">("BASICO");

  // Trial modal
  const [trialModal, setTrialModal] = useState<SalonItem | null>(null);
  const [trialDias, setTrialDias] = useState("30");

  // Novo salão modal
  const [novoModal, setNovoModal] = useState(false);
  const [novoForm, setNovoForm] = useState(novoDefault);
  const [novoSaving, setNovoSaving] = useState(false);
  const [senhaGerada, setSenhaGerada] = useState<string | null>(null);

  // Editar salão modal
  const [editModal, setEditModal] = useState<SalonItem | null>(null);
  const [editForm, setEditForm] = useState({ salonName: "", ownerName: "", phone: "", city: "", logoUrl: "" });
  const [editLogoUploading, setEditLogoUploading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  // Usuários modal
  const [usuariosModal, setUsuariosModal] = useState<SalonItem | null>(null);
  const [usuariosData, setUsuariosData] = useState<SalonUsersData | null>(null);
  const [usuariosLoading, setUsuariosLoading] = useState(false);
  const [novoUserForm, setNovoUserForm] = useState({ name: "", email: "", phone: "", password: "", showPass: false });
  const [novoUserSaving, setNovoUserSaving] = useState(false);
  const [novoUserSenha, setNovoUserSenha] = useState<string | null>(null);
  const [resetPasswordUserId, setResetPasswordUserId] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editUserForm, setEditUserForm] = useState({ name: "", email: "", phone: "" });
  const [userActionId, setUserActionId] = useState<string | null>(null);

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

  /* ── Bloquear / Liberar ─────────────────────────────── */
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
      toast.error("Erro ao atualizar acesso");
    } finally {
      setActionId(null);
    }
  }

  /* ── Salvar contrato ────────────────────────────────── */
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
          diaVencimento: parseInt(contratoDia) || 10,
          plano: contratoPlano,
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

  /* ── Salvar trial ───────────────────────────────────── */
  async function saveTrial() {
    if (!trialModal) return;
    setActionId("trial");
    try {
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: trialModal.owner.id,
          trialExpires: addDays(new Date(), parseInt(trialDias) || 30).toISOString(),
        }),
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

  /* ── Criar salão ────────────────────────────────────── */
  async function criarSalon() {
    const { salonName, name, email, comContrato, contratoValor: cv, contratoDia: cd } = novoForm;
    if (!salonName.trim() || !name.trim() || !email.trim()) return;
    if (comContrato && !cv) { toast.error("Informe o valor mensal do contrato"); return; }

    setNovoSaving(true);
    try {
      const res = await fetch("/api/master/saloes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonName: novoForm.salonName,
          ownerName: novoForm.name,
          email: novoForm.email,
          phone: novoForm.phone,
          ...(comContrato && cv ? { contratoValor: cv, contratoDia: cd, contratoPlano: novoForm.contratoPlano } : {}),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao cadastrar salão");
        return;
      }
      toast.success("Salão cadastrado!");
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
      if (json.senhaGerada) {
        setSenhaGerada(json.senhaGerada);
      } else {
        setNovoModal(false);
        setNovoForm(novoDefault);
      }
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setNovoSaving(false);
    }
  }

  /* ── Upload logo (edição) ───────────────────────────── */
  async function handleLogoUpload(file: File) {
    if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2 MB"); return; }
    setEditLogoUploading(true);
    try {
      const blob = await upload(`logos/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setEditForm((f) => ({ ...f, logoUrl: blob.url }));
      toast.success("Logo carregada");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setEditLogoUploading(false);
    }
  }

  /* ── Salvar edição ──────────────────────────────────── */
  async function salvarEdicao() {
    if (!editModal) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/master/saloes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId: editModal.id,
          salonName: editForm.salonName,
          city: editForm.city,
          logoUrl: editForm.logoUrl || null,
          ownerName: editForm.ownerName,
          phone: editForm.phone,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Salão atualizado");
      setEditModal(null);
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao salvar alterações");
    } finally {
      setEditSaving(false);
    }
  }

  function openEdit(salon: SalonItem) {
    setEditModal(salon);
    setEditForm({
      salonName: salon.name,
      ownerName: salon.owner.name,
      phone: salon.owner.phone ?? "",
      city: salon.city ?? "",
      logoUrl: salon.logoUrl ?? "",
    });
  }

  function openContrato(salon: SalonItem) {
    setContratoModal(salon);
    setContratoValor(salon.contratos[0] ? String(salon.contratos[0].valorMensal) : "");
    setContratoDia(salon.contratos[0] ? String(salon.contratos[0].diaVencimento) : "10");
    setContratoPlano(salon.contratos[0]?.plano as any ?? "BASICO");
  }

  /* ── Usuários ───────────────────────────────────────── */
  async function openUsuarios(salon: SalonItem) {
    setUsuariosModal(salon);
    setUsuariosData(null);
    setNovoUserForm({ name: "", email: "", phone: "", password: "", showPass: false });
    setNovoUserSenha(null);
    setResetPasswordUserId(null);
    setEditUserId(null);
    setUsuariosLoading(true);
    try {
      const res = await fetch(`/api/master/saloes/${salon.id}/usuarios`);
      const json = await res.json();
      setUsuariosData(json);
    } catch {
      toast.error("Erro ao carregar usuários");
    } finally {
      setUsuariosLoading(false);
    }
  }

  async function criarUsuario() {
    if (!usuariosModal || !novoUserForm.name.trim() || !novoUserForm.email.trim()) return;
    setNovoUserSaving(true);
    try {
      const res = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: novoUserForm.name,
          email: novoUserForm.email,
          phone: novoUserForm.phone,
          password: novoUserForm.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao criar usuário"); return; }
      toast.success("Usuário criado!");
      if (json.senhaGerada) setNovoUserSenha(json.senhaGerada);
      setNovoUserForm({ name: "", email: "", phone: "", password: "", showPass: false });
      // Reload users list
      const updated = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios`).then((r) => r.json());
      setUsuariosData(updated);
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setNovoUserSaving(false);
    }
  }

  async function toggleUserActive(userId: string, currentActive: boolean, isOwner: boolean) {
    if (!usuariosModal) return;
    setUserActionId(userId);
    try {
      const url = isOwner
        ? `/api/master/usuarios`
        : `/api/master/saloes/${usuariosModal.id}/usuarios/${userId}`;
      const body = isOwner
        ? { id: userId, blocked: currentActive }
        : { active: !currentActive };
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success(currentActive ? "Usuário desativado" : "Usuário ativado");
      const updated = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios`).then((r) => r.json());
      setUsuariosData(updated);
      qc.invalidateQueries({ queryKey: ["master-saloes"] });
    } catch {
      toast.error("Erro ao atualizar usuário");
    } finally {
      setUserActionId(null);
    }
  }

  async function resetarSenha(userId: string) {
    if (!usuariosModal || !resetPasswordValue.trim()) return;
    setUserActionId(userId);
    try {
      const res = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      if (!res.ok) throw new Error();
      toast.success("Senha redefinida");
      setResetPasswordUserId(null);
      setResetPasswordValue("");
    } catch {
      toast.error("Erro ao redefinir senha");
    } finally {
      setUserActionId(null);
    }
  }

  async function editarUsuario(userId: string) {
    if (!usuariosModal) return;
    setUserActionId(userId);
    try {
      const res = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editUserForm.name,
          phone: editUserForm.phone,
          email: editUserForm.email,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Usuário atualizado");
      setEditUserId(null);
      const updated = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios`).then((r) => r.json());
      setUsuariosData(updated);
    } catch {
      toast.error("Erro ao atualizar usuário");
    } finally {
      setUserActionId(null);
    }
  }

  async function removerUsuario(userId: string) {
    if (!usuariosModal) return;
    setUserActionId(userId);
    try {
      const res = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios/${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      toast.success("Usuário removido do salão");
      const updated = await fetch(`/api/master/saloes/${usuariosModal.id}/usuarios`).then((r) => r.json());
      setUsuariosData(updated);
    } catch {
      toast.error("Erro ao remover usuário");
    } finally {
      setUserActionId(null);
    }
  }

  /* ── RENDER ─────────────────────────────────────────── */
  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Salões</h1>
          <p className="text-zinc-500 text-sm mt-0.5">{saloes.length} salão(ões) cadastrado(s)</p>
        </div>
        <button
          onClick={() => { setNovoModal(true); setNovoForm(novoDefault); setSenhaGerada(null); }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white transition-all"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" /> Cadastrar novo
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
      <div className="rounded-2xl overflow-hidden" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
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
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-xl flex-shrink-0 overflow-hidden"
                    style={salon.logoUrl ? { border: "1px solid rgba(255,255,255,0.1)" } : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                    {salon.logoUrl
                      ? <img src={salon.logoUrl} alt={salon.name} className="w-full h-full object-cover" />
                      : <span className="w-full h-full flex items-center justify-center text-white font-black text-sm">{salon.name.charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white text-sm font-bold">{salon.name}</span>
                      <StatusBadge owner={salon.owner} temContrato={salon.contratos.length > 0} />
                      {salon.contratos[0] && (
                        <PlanoBadge plano={salon.contratos[0].plano} />
                      )}
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

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openContrato(salon)}
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
                    onClick={() => openUsuarios(salon)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: "rgba(59,130,246,0.12)", color: "#60a5fa" }}
                  >
                    <Users className="w-3 h-3" /> Usuários
                  </button>
                  <button
                    onClick={() => openEdit(salon)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                    style={{ background: "rgba(124,58,237,0.15)", color: "#a78bfa" }}
                  >
                    <Pencil className="w-3 h-3" /> Editar
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

      {/* ── Modal: Contrato ──────────────────────────────── */}
      {contratoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(16,185,129,0.25)" }}>
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between"
              style={{ background: "rgba(16,185,129,0.08)" }}>
              <div>
                <p className="text-white font-black text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  {contratoModal.contratos[0] ? "Editar contrato" : "Ativar contrato"}
                </p>
                <p className="text-zinc-500 text-xs mt-0.5">{contratoModal.name}</p>
              </div>
              <button onClick={() => setContratoModal(null)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>

            {/* Contrato ativo badge */}
            {contratoModal.contratos[0] && (
              <div className="mx-5 mt-4 px-3 py-2 rounded-lg flex items-center gap-2"
                style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <p className="text-emerald-400 text-xs font-semibold">
                  Contrato ativo · {fmt(Number(contratoModal.contratos[0].valorMensal))}/mês · Vence dia {contratoModal.contratos[0].diaVencimento}
                </p>
              </div>
            )}

            <div className="px-5 py-5 space-y-3">
              {/* Plan selector */}
              <div>
                <label className={labelClass}>Plano *</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {(["BASICO", "PRATA", "OURO"] as const).map((p) => {
                    const info = { BASICO: { nome: "Básico", preco: "R$ 60", cor: "#6366f1" }, PRATA: { nome: "Prata", preco: "R$ 90", cor: "#64748b" }, OURO: { nome: "Ouro", preco: "R$ 250", cor: "#d97706" } }[p];
                    const sel = contratoPlano === p;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => { setContratoPlano(p); setContratoValor(info.preco.replace("R$ ", "")); }}
                        className="py-2 px-1 rounded-lg text-center transition-all"
                        style={{
                          background: sel ? `${info.cor}22` : "rgba(255,255,255,0.04)",
                          border: `1px solid ${sel ? info.cor : "rgba(255,255,255,0.08)"}`,
                        }}
                      >
                        <p className="text-[10px] font-black" style={{ color: sel ? info.cor : "#6b7280" }}>{info.nome}</p>
                        <p className="text-[9px] text-zinc-600 mt-0.5">{info.preco}/mês</p>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className={labelClass}>Valor mensal (R$) *</label>
                <input
                  type="number"
                  value={contratoValor}
                  onChange={(e) => setContratoValor(e.target.value)}
                  placeholder="97.00"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Dia de vencimento (1–28)</label>
                <input
                  type="number"
                  min={1} max={28}
                  value={contratoDia}
                  onChange={(e) => setContratoDia(e.target.value)}
                  className={fieldClass}
                />
                <p className="text-zinc-600 text-[10px] mt-1.5">
                  A cobrança começa após o trial de 30 dias da criação do salão.
                </p>
              </div>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={saveContrato}
                disabled={!contratoValor || actionId === "contrato"}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg,#059669,#047857)" }}
              >
                {actionId === "contrato"
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <><CheckCircle className="w-4 h-4" />{contratoModal.contratos[0] ? "Atualizar" : "Ativar contrato"}</>}
              </button>
              <button onClick={() => setContratoModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Trial ─────────────────────────────────── */}
      {trialModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Estender trial — {trialModal.name}</p>
              <button onClick={() => setTrialModal(null)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>
            <div className="px-5 py-5">
              <label className={labelClass}>Dias a partir de hoje</label>
              <input
                type="number"
                value={trialDias}
                onChange={(e) => setTrialDias(e.target.value)}
                min={1} max={365}
                className={fieldClass}
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

      {/* ── Modal: Editar salão ───────────────────────────── */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Editar — {editModal.name}</p>
              <button onClick={() => setEditModal(null)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>
            <div className="px-5 py-5 space-y-3">
              {/* Logo */}
              <div>
                <label className={labelClass}>Logo do salão</label>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 flex items-center justify-center"
                    style={editForm.logoUrl ? { border: "1px solid rgba(255,255,255,0.15)" } : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                    {editForm.logoUrl
                      ? <img src={editForm.logoUrl} alt="logo" className="w-full h-full object-cover" />
                      : <ImageIcon className="w-6 h-6 text-white/50" />
                    }
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <button
                      type="button"
                      disabled={editLogoUploading}
                      onClick={() => logoInputRef.current?.click()}
                      className="w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                      style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.3)" }}
                    >
                      {editLogoUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <><ImageIcon className="w-3 h-3" /> Enviar logo</>}
                    </button>
                    {editForm.logoUrl && (
                      <button
                        type="button"
                        onClick={() => setEditForm((f) => ({ ...f, logoUrl: "" }))}
                        className="w-full py-1.5 rounded-lg text-xs font-bold text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleLogoUpload(f); e.target.value = ""; }}
                />
              </div>

              {/* Fields */}
              {[
                { label: "Nome do salão", key: "salonName" as const },
                { label: "Nome do proprietário", key: "ownerName" as const },
                { label: "WhatsApp", key: "phone" as const },
                { label: "Cidade", key: "city" as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className={labelClass}>{label}</label>
                  <input
                    value={editForm[key]}
                    onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}
                    className={fieldClass}
                  />
                </div>
              ))}
              <p className="text-zinc-700 text-xs">E-mail: {editModal.owner.email}</p>
            </div>
            <div className="px-5 pb-5 flex gap-2">
              <button
                onClick={salvarEdicao}
                disabled={editSaving || editLogoUploading}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                {editSaving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar alterações"}
              </button>
              <button onClick={() => setEditModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Novo salão ─────────────────────────────── */}
      {novoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl overflow-hidden" style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Cadastrar novo salão</p>
              <button onClick={() => setNovoModal(false)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>

            {senhaGerada ? (
              <div className="px-5 py-6 space-y-4">
                <p className="text-green-400 text-sm font-bold">Salão cadastrado com sucesso!</p>
                <div>
                  <p className="text-zinc-400 text-xs mb-1.5">Senha gerada automaticamente — anote e envie ao proprietário:</p>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                    <code className="text-violet-300 text-sm font-mono flex-1 select-all">{senhaGerada}</code>
                  </div>
                </div>
                <button
                  onClick={() => { setNovoModal(false); setNovoForm(novoDefault); setSenhaGerada(null); }}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <div className="overflow-y-auto max-h-[80vh]">
                <div className="px-5 py-5 space-y-3">
                  {[
                    { label: "Nome do salão *", key: "salonName", type: "text", placeholder: "Barbearia do João" },
                    { label: "Nome do proprietário *", key: "name", type: "text", placeholder: "João Silva" },
                    { label: "E-mail *", key: "email", type: "email", placeholder: "joao@email.com" },
                    { label: "WhatsApp", key: "phone", type: "tel", placeholder: "(11) 99999-9999" },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key}>
                      <label className={labelClass}>{label}</label>
                      <input
                        type={type}
                        value={(novoForm as any)[key]}
                        onChange={(e) => setNovoForm((f) => ({ ...f, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className={fieldClass}
                      />
                    </div>
                  ))}

                  {/* Contrato */}
                  <div
                    className="rounded-xl p-3 cursor-pointer select-none"
                    style={{ background: novoForm.comContrato ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.03)", border: `1px solid ${novoForm.comContrato ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}` }}
                    onClick={() => setNovoForm((f) => ({ ...f, comContrato: !f.comContrato }))}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 transition-colors ${novoForm.comContrato ? "bg-emerald-500" : "bg-white/10"}`}>
                        {novoForm.comContrato && <CheckCircle className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold text-white">Criar contrato de cobrança</span>
                    </div>
                    {novoForm.comContrato && (
                      <p className="text-zinc-500 text-[10px] mt-1 ml-6">Cobrança inicia após 30 dias de trial.</p>
                    )}
                  </div>

                  {novoForm.comContrato && (
                    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                      {/* Plan selector */}
                      <div>
                        <label className={labelClass}>Plano *</label>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(["BASICO", "PRATA", "OURO"] as const).map((p) => {
                            const info = { BASICO: { nome: "Básico", preco: "R$ 60", cor: "#6366f1" }, PRATA: { nome: "Prata", preco: "R$ 90", cor: "#64748b" }, OURO: { nome: "Ouro", preco: "R$ 250", cor: "#d97706" } }[p];
                            const sel = novoForm.contratoPlano === p;
                            return (
                              <button
                                key={p}
                                type="button"
                                onClick={() => setNovoForm((f) => ({ ...f, contratoPlano: p, contratoValor: info.preco.replace("R$ ", "") }))}
                                className="py-2 px-1 rounded-lg text-center transition-all"
                                style={{
                                  background: sel ? `${info.cor}22` : "rgba(255,255,255,0.04)",
                                  border: `1px solid ${sel ? info.cor : "rgba(255,255,255,0.08)"}`,
                                }}
                              >
                                <p className="text-[10px] font-black" style={{ color: sel ? info.cor : "#6b7280" }}>{info.nome}</p>
                                <p className="text-[9px] text-zinc-600 mt-0.5">{info.preco}/mês</p>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className={labelClass}>Valor mensal (R$) *</label>
                          <input
                            type="number"
                            value={novoForm.contratoValor}
                            onChange={(e) => setNovoForm((f) => ({ ...f, contratoValor: e.target.value }))}
                            placeholder="99.90"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Dia vencimento</label>
                          <input
                            type="number"
                            min={1} max={28}
                            value={novoForm.contratoDia}
                            onChange={(e) => setNovoForm((f) => ({ ...f, contratoDia: e.target.value }))}
                            className={fieldClass}
                          />
                        </div>
                      </div>
                    </div>
                  )}
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
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Modal: Usuários ───────────────────────────────── */}
      {usuariosModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col max-h-[90vh]" style={{ background: "#1a1040", border: "1px solid rgba(59,130,246,0.3)" }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
              <div>
                <p className="text-white font-black text-sm flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-400" />
                  Usuários — {usuariosModal.name}
                </p>
                {usuariosData && (
                  <p className="text-zinc-500 text-xs mt-0.5">
                    {usuariosData.totalBarbers} profissional(is)
                    {usuariosData.maxFuncionarios !== null ? ` / máx ${usuariosData.maxFuncionarios} (${usuariosData.plano})` : " (ilimitado)"}
                  </p>
                )}
              </div>
              <button onClick={() => setUsuariosModal(null)}><X className="w-4 h-4 text-zinc-500 hover:text-zinc-300" /></button>
            </div>

            <div className="overflow-y-auto flex-1">
              {usuariosLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                </div>
              ) : usuariosData ? (
                <div className="px-5 py-4 space-y-4">

                  {/* Owner */}
                  <div>
                    <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Proprietário</p>
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                        {usuariosData.owner.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{usuariosData.owner.name}</p>
                        <p className="text-zinc-500 text-xs truncate">{usuariosData.owner.email}</p>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}>
                        OWNER
                      </span>
                    </div>
                  </div>

                  {/* Barbers list */}
                  {usuariosData.barbers.length > 0 && (
                    <div>
                      <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest mb-2">Profissionais</p>
                      <div className="space-y-2">
                        {usuariosData.barbers.map((b) => (
                          <div key={b.id} className="rounded-xl overflow-hidden" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                            {/* Row */}
                            <div className="flex items-center gap-3 px-3 py-2.5">
                              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white flex-shrink-0"
                                style={{ background: b.active ? "rgba(59,130,246,0.3)" : "rgba(255,255,255,0.1)" }}>
                                {b.user.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-semibold truncate ${b.active ? "text-white" : "text-zinc-500"}`}>{b.user.name}</p>
                                <p className="text-zinc-500 text-xs truncate">{b.user.email}</p>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {!b.active && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-400 mr-1">Inativo</span>}
                                {/* Edit toggle */}
                                <button
                                  title="Editar"
                                  onClick={() => {
                                    if (editUserId === b.user.id) { setEditUserId(null); return; }
                                    setEditUserId(b.user.id);
                                    setEditUserForm({ name: b.user.name, email: b.user.email, phone: b.user.phone ?? "" });
                                    setResetPasswordUserId(null);
                                  }}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                  style={{ color: editUserId === b.user.id ? "#a78bfa" : "#6b7280" }}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {/* Reset password toggle */}
                                <button
                                  title="Redefinir senha"
                                  onClick={() => {
                                    setResetPasswordUserId(resetPasswordUserId === b.user.id ? null : b.user.id);
                                    setResetPasswordValue("");
                                    setEditUserId(null);
                                  }}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                  style={{ color: resetPasswordUserId === b.user.id ? "#fbbf24" : "#6b7280" }}
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                </button>
                                {/* Toggle active */}
                                <button
                                  title={b.active ? "Desativar" : "Ativar"}
                                  disabled={userActionId === b.user.id}
                                  onClick={() => toggleUserActive(b.user.id, b.active, false)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10"
                                  style={{ color: b.active ? "#ef4444" : "#10b981" }}
                                >
                                  {userActionId === b.user.id
                                    ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    : b.active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                                {/* Remove */}
                                <button
                                  title="Remover do salão"
                                  disabled={userActionId === b.user.id}
                                  onClick={() => removerUsuario(b.user.id)}
                                  className="p-1.5 rounded-lg transition-colors hover:bg-white/10 text-zinc-600 hover:text-red-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            {/* Inline edit form */}
                            {editUserId === b.user.id && (
                              <div className="px-3 pb-3 pt-1 border-t border-white/5 space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className={labelClass}>Nome</label>
                                    <input
                                      value={editUserForm.name}
                                      onChange={(e) => setEditUserForm((f) => ({ ...f, name: e.target.value }))}
                                      className={fieldClass}
                                    />
                                  </div>
                                  <div>
                                    <label className={labelClass}>WhatsApp</label>
                                    <input
                                      type="tel"
                                      value={editUserForm.phone}
                                      onChange={(e) => setEditUserForm((f) => ({ ...f, phone: e.target.value }))}
                                      className={fieldClass}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <label className={labelClass}>E-mail</label>
                                  <input
                                    type="email"
                                    value={editUserForm.email}
                                    onChange={(e) => setEditUserForm((f) => ({ ...f, email: e.target.value }))}
                                    className={fieldClass}
                                  />
                                </div>
                                <button
                                  onClick={() => editarUsuario(b.user.id)}
                                  disabled={!editUserForm.name.trim() || userActionId === b.user.id}
                                  className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-1.5"
                                  style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
                                >
                                  {userActionId === b.user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Salvar alterações</>}
                                </button>
                              </div>
                            )}
                            {/* Inline reset password */}
                            {resetPasswordUserId === b.user.id && (
                              <div className="px-3 pb-3 pt-1 border-t border-white/5">
                                <label className={labelClass}>Nova senha</label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Mínimo 6 caracteres"
                                    value={resetPasswordValue}
                                    onChange={(e) => setResetPasswordValue(e.target.value)}
                                    className={fieldClass + " flex-1"}
                                  />
                                  <button
                                    onClick={() => resetarSenha(b.user.id)}
                                    disabled={!resetPasswordValue.trim() || userActionId === b.user.id}
                                    className="px-3 py-2 rounded-lg text-xs font-bold text-white disabled:opacity-50 flex items-center gap-1.5"
                                    style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}
                                  >
                                    {userActionId === b.user.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Save className="w-3.5 h-3.5" /> Salvar</>}
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Senha gerada */}
                  {novoUserSenha && (
                    <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                      <p className="text-emerald-400 text-xs font-bold">Usuário criado! Anote a senha gerada:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-emerald-300 text-sm font-mono flex-1 select-all">{novoUserSenha}</code>
                        <button onClick={() => setNovoUserSenha(null)} className="text-zinc-500 hover:text-zinc-300">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Add new user form */}
                  {(usuariosData.maxFuncionarios === null || usuariosData.totalBarbers < usuariosData.maxFuncionarios) ? (
                    <div className="rounded-xl overflow-hidden" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.2)" }}>
                      <div className="px-4 pt-3 pb-2 border-b border-white/5">
                        <p className="text-blue-400 text-xs font-bold flex items-center gap-2">
                          <UserPlus className="w-3.5 h-3.5" /> Adicionar profissional
                        </p>
                      </div>
                      <div className="px-4 py-3 space-y-2.5">
                        <div>
                          <label className={labelClass}>Nome *</label>
                          <input
                            value={novoUserForm.name}
                            onChange={(e) => setNovoUserForm((f) => ({ ...f, name: e.target.value }))}
                            placeholder="Nome completo"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>E-mail *</label>
                          <input
                            type="email"
                            value={novoUserForm.email}
                            onChange={(e) => setNovoUserForm((f) => ({ ...f, email: e.target.value }))}
                            placeholder="email@exemplo.com"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>WhatsApp</label>
                          <input
                            type="tel"
                            value={novoUserForm.phone}
                            onChange={(e) => setNovoUserForm((f) => ({ ...f, phone: e.target.value }))}
                            placeholder="(11) 99999-9999"
                            className={fieldClass}
                          />
                        </div>
                        <div>
                          <label className={labelClass}>Senha (deixe em branco para gerar)</label>
                          <div className="relative">
                            <input
                              type={novoUserForm.showPass ? "text" : "password"}
                              value={novoUserForm.password}
                              onChange={(e) => setNovoUserForm((f) => ({ ...f, password: e.target.value }))}
                              placeholder="••••••••"
                              className={fieldClass + " pr-9"}
                            />
                            <button
                              type="button"
                              onClick={() => setNovoUserForm((f) => ({ ...f, showPass: !f.showPass }))}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                            >
                              {novoUserForm.showPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <button
                          onClick={criarUsuario}
                          disabled={!novoUserForm.name.trim() || !novoUserForm.email.trim() || novoUserSaving}
                          className="w-full py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                          style={{ background: "linear-gradient(135deg,#2563eb,#1d4ed8)" }}
                        >
                          {novoUserSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><UserPlus className="w-4 h-4" /> Criar usuário</>}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl px-4 py-3 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <p className="text-red-400 text-xs font-semibold">
                        Limite de {usuariosData.maxFuncionarios} funcionário(s) atingido no plano {usuariosData.plano}.
                      </p>
                      <p className="text-zinc-600 text-xs mt-0.5">Faça upgrade do contrato para adicionar mais usuários.</p>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="px-5 py-3 border-t border-white/5 flex-shrink-0">
              <button
                onClick={() => setUsuariosModal(null)}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
