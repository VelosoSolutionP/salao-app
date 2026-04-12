"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Search, Users, Loader2, MessageCircle, ChevronLeft, ChevronRight,
  Plus, Pencil, Trash2, Share2, Copy,
  Phone, Mail, Calendar, Star, TrendingUp, X, CheckCircle2,
  AlertTriangle, UserPlus, Globe, Send,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatBRL, formatDate, getInitials } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function gradientFor(name: string) {
  const gradients = [
    "from-violet-500 to-purple-600",
    "from-blue-500 to-indigo-600",
    "from-emerald-500 to-teal-600",
    "from-orange-500 to-amber-600",
    "from-pink-500 to-rose-600",
    "from-cyan-500 to-blue-600",
  ];
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) & 0xffff;
  return gradients[hash % gradients.length];
}

function statusLabel(totalVisitas: number): { label: string; color: string } {
  if (totalVisitas >= 10) return { label: "VIP",       color: "bg-amber-100 text-amber-700"   };
  if (totalVisitas >= 5)  return { label: "Fiel",      color: "bg-violet-100 text-violet-700" };
  if (totalVisitas >= 2)  return { label: "Regular",   color: "bg-blue-100 text-blue-700"     };
  return                         { label: "Novo",       color: "bg-gray-100 text-gray-500"     };
}

// ─── Share Modal ──────────────────────────────────────────────────────────────

function ShareModal({
  open, onClose, clienteName, clientePhone,
}: {
  open: boolean; onClose: () => void;
  clienteName: string; clientePhone?: string | null;
}) {
  const [copied, setCopied] = useState(false);
  const link = typeof window !== "undefined" ? `${window.location.origin}/agendar` : "/agendar";

  function copy() {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copiado!");
  }

  function whatsapp() {
    const phone = clientePhone?.replace(/\D/g, "");
    const msg = encodeURIComponent(
      `Olá ${clienteName}! 😊 Que tal agendar seu próximo atendimento com a gente? Acesse o link e escolha o melhor horário: ${link}`
    );
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
  }

  function facebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`, "_blank");
  }

  function instagram() {
    // Instagram não tem share URL direto — copia o link e abre o app
    navigator.clipboard.writeText(link);
    toast.success("Link copiado! Cole na bio ou story do Instagram.");
    window.open("https://instagram.com", "_blank");
  }

  const options = [
    {
      icon: <MessageCircle className="w-5 h-5" />,
      label: "WhatsApp",
      sublabel: clientePhone ? `Enviar para ${clienteName}` : "Sem telefone cadastrado",
      bg: "bg-[#25D366]",
      action: clientePhone ? whatsapp : () => toast.error("Telefone não cadastrado"),
      disabled: !clientePhone,
    },
    {
      icon: <Globe className="w-5 h-5" />,
      label: "Instagram",
      sublabel: "Copiar link para story/bio",
      bg: "bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400",
      action: instagram,
      disabled: false,
    },
    {
      icon: <Send className="w-5 h-5" />,
      label: "Facebook",
      sublabel: "Compartilhar publicação",
      bg: "bg-[#1877F2]",
      action: facebook,
      disabled: false,
    },
    {
      icon: copied ? <CheckCircle2 className="w-5 h-5" /> : <Copy className="w-5 h-5" />,
      label: copied ? "Copiado!" : "Copiar link",
      sublabel: "Cole em qualquer lugar",
      bg: copied ? "bg-emerald-500" : "bg-gray-700",
      action: copy,
      disabled: false,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-violet-500" />
            Compartilhar link de agendamento
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-gray-400 -mt-2 mb-1">
          Compartilhe o link com <span className="font-semibold text-gray-600">{clienteName}</span> para que ela/ele possa agendar online.
        </p>

        {/* Link preview */}
        <div className="flex items-center gap-2 bg-gray-50 border rounded-xl px-3 py-2.5 mb-3">
          <span className="text-xs text-gray-500 truncate flex-1 font-mono">{link}</span>
          <button onClick={copy} className="text-violet-500 hover:text-violet-700 flex-shrink-0">
            {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="space-y-2">
          {options.map((opt) => (
            <button
              key={opt.label}
              onClick={opt.action}
              disabled={opt.disabled}
              className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all ${
                opt.disabled ? "opacity-40 cursor-not-allowed" : "hover:opacity-90 active:scale-[0.98]"
              }`}
            >
              <div className={`w-10 h-10 rounded-xl ${opt.bg} flex items-center justify-center text-white flex-shrink-0 shadow-sm`}>
                {opt.icon}
              </div>
              <div className="text-left">
                <p className="font-semibold text-sm text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-400">{opt.sublabel}</p>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Novo / Editar Cliente Modal ──────────────────────────────────────────────

function ClienteFormModal({
  open, onClose, cliente, onSuccess,
}: {
  open: boolean; onClose: () => void;
  cliente?: Record<string, unknown> | null;
  onSuccess: () => void;
}) {
  const isEdit = !!cliente;
  const qc = useQueryClient();

  const [name,     setName]     = useState((cliente?.user as Record<string,string>)?.name     ?? "");
  const [email,    setEmail]    = useState("");
  const [phone,    setPhone]    = useState((cliente?.user as Record<string,string>)?.phone    ?? "");
  const [dataNasc, setDataNasc] = useState(
    cliente?.dataNasc ? new Date(cliente.dataNasc as string).toISOString().slice(0, 10) : ""
  );
  const [genero,   setGenero]   = useState((cliente?.genero as string)  ?? "");
  const [notas,    setNotas]    = useState((cliente?.notas  as string)  ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setName(""); setEmail(""); setPhone(""); setDataNasc(""); setGenero(""); setNotas(""); setFieldErrors({});
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = "Nome obrigatório";
    if (!isEdit && !email.includes("@")) errs.email = "Email inválido";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setSubmitting(true);
    try {
      const url    = isEdit ? `/api/clientes/${(cliente as Record<string,string>).id}` : "/api/clientes";
      const method = isEdit ? "PATCH" : "POST";
      const body: Record<string, unknown> = {
        name:     name.trim(),
        phone:    phone.trim()    || undefined,
        dataNasc: dataNasc        || undefined,
        genero:   genero          || undefined,
        notas:    notas.trim()    || undefined,
      };
      if (!isEdit) body.email = email.trim().toLowerCase();

      const res  = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error?.name?.[0] ?? json.error ?? "Erro ao salvar"); return; }
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success(isEdit ? "Cliente atualizado!" : "Cliente cadastrado!");
      resetForm();
      onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  const inputCls = "w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-violet-500";

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isEdit ? <Pencil className="w-4 h-4 text-violet-500" /> : <UserPlus className="w-4 h-4 text-violet-500" />}
            {isEdit ? "Editar cliente" : "Novo cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nome completo *</label>
            <input type="text" placeholder="Ana Silva" value={name}
              onChange={(e) => { setName(e.target.value); setFieldErrors((er) => ({ ...er, name: "" })); }}
              className={inputCls} />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>

          {!isEdit && (
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Email *</label>
              <input type="email" placeholder="ana@email.com" value={email}
                onChange={(e) => { setEmail(e.target.value); setFieldErrors((er) => ({ ...er, email: "" })); }}
                className={inputCls} />
              {fieldErrors.email && <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">WhatsApp / Telefone</label>
            <input type="text" placeholder="(11) 99999-0000" value={phone}
              onChange={(e) => setPhone(e.target.value)} className={inputCls} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nascimento</label>
              <input type="date" value={dataNasc} onChange={(e) => setDataNasc(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Gênero</label>
              <select value={genero} onChange={(e) => setGenero(e.target.value)}
                className={`${inputCls} bg-white`}>
                <option value="">Selecionar</option>
                <option value="Feminino">Feminino</option>
                <option value="Masculino">Masculino</option>
                <option value="Não-binário">Não-binário</option>
                <option value="Prefiro não informar">Prefiro não informar</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
            <textarea placeholder="Preferências, alergias, observações..." rows={3}
              value={notas} onChange={(e) => setNotas(e.target.value)}
              className={`${inputCls} resize-none`} />
          </div>

          <div className="flex gap-2 pt-1">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
            <Button type="button" className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
              disabled={submitting} onClick={handleSubmit}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? "Salvar" : "Cadastrar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Perfil do Cliente (Drawer lateral) ──────────────────────────────────────

function ClientePerfil({
  clienteId, onClose, onEdit, onDelete, onShare,
}: {
  clienteId: string | null;
  onClose:  () => void;
  onEdit:   (c: Record<string, unknown>) => void;
  onDelete: (c: Record<string, unknown>) => void;
  onShare:  (c: Record<string, unknown>) => void;
}) {
  const { data: c, isLoading } = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => fetch(`/api/clientes/${clienteId}?historico=true`).then((r) => r.json()),
    enabled: !!clienteId,
  });

  if (!clienteId) return null;

  const STATUS_LABELS: Record<string, string> = {
    PENDENTE:       "Pendente",
    CONFIRMADO:     "Confirmado",
    EM_ANDAMENTO:   "Em andamento",
    CONCLUIDO:      "Concluído",
    CANCELADO:      "Cancelado",
    NAO_COMPARECEU: "Não compareceu",
  };

  const STATUS_COLORS: Record<string, string> = {
    PENDENTE:       "bg-yellow-100 text-yellow-700",
    CONFIRMADO:     "bg-blue-100 text-blue-700",
    EM_ANDAMENTO:   "bg-violet-100 text-violet-700",
    CONCLUIDO:      "bg-emerald-100 text-emerald-700",
    CANCELADO:      "bg-red-100 text-red-700",
    NAO_COMPARECEU: "bg-orange-100 text-orange-700",
  };

  return (
    <Dialog open={!!clienteId} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md max-h-[92vh] overflow-y-auto p-0">
        {isLoading || !c || c.error ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div>
            {/* Header com gradiente */}
            <div className={`bg-gradient-to-br ${gradientFor(c.user.name)} p-6 text-white rounded-t-2xl relative`}>
              <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-end gap-4">
                <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center text-2xl font-black shadow-lg ring-2 ring-white/30">
                  {getInitials(c.user.name)}
                </div>
                <div className="flex-1 min-w-0 pb-0.5">
                  <h2 className="text-xl font-black truncate">{c.user.name}</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {(() => {
                      const s = statusLabel(c.totalVisitas);
                      return <span className="text-xs font-bold bg-white/20 px-2 py-0.5 rounded-full">{s.label}</span>;
                    })()}
                    {c.genero && <span className="text-xs text-white/70">{c.genero}</span>}
                  </div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 mt-5">
                {[
                  { label: "Visitas",      value: c.totalVisitas },
                  { label: "Total gasto",  value: formatBRL(c.totalGasto) },
                  { label: "Última visita",value: c.ultimaVisita ? formatDate(c.ultimaVisita) : "—" },
                ].map((s) => (
                  <div key={s.label} className="bg-white/15 rounded-xl p-2.5 text-center">
                    <p className="text-base font-black leading-tight">{s.value}</p>
                    <p className="text-[10px] text-white/70 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Conteúdo */}
            <div className="p-5 space-y-4">
              {/* Contato */}
              <div className="space-y-2">
                {c.user.phone && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-3.5 h-3.5 text-green-600" />
                    </div>
                    {c.user.phone}
                  </div>
                )}
                <div className="flex items-center gap-2.5 text-sm text-gray-600">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-3.5 h-3.5 text-blue-600" />
                  </div>
                  {c.user.email}
                </div>
                {c.dataNasc && (
                  <div className="flex items-center gap-2.5 text-sm text-gray-600">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    {formatDate(c.dataNasc, "dd/MM/yyyy")}
                  </div>
                )}
              </div>

              {/* Observações */}
              {c.notas && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                  <p className="text-xs font-semibold text-amber-700 mb-1 flex items-center gap-1">
                    <Star className="w-3 h-3" /> Observações
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">{c.notas}</p>
                </div>
              )}

              {/* Ações */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => c.user.phone && window.open(`https://wa.me/55${c.user.phone.replace(/\D/g,"")}`, "_blank")}
                  disabled={!c.user.phone}
                  className="flex flex-col items-center gap-1.5 p-3 bg-[#25D366]/10 hover:bg-[#25D366]/20 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <MessageCircle className="w-5 h-5 text-[#25D366]" />
                  <span className="text-xs font-semibold text-gray-700">WhatsApp</span>
                </button>
                <button
                  onClick={() => onShare(c)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-violet-50 hover:bg-violet-100 rounded-xl transition-colors"
                >
                  <Share2 className="w-5 h-5 text-violet-500" />
                  <span className="text-xs font-semibold text-gray-700">Compartilhar</span>
                </button>
                <button
                  onClick={() => onEdit(c)}
                  className="flex flex-col items-center gap-1.5 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <Pencil className="w-5 h-5 text-blue-500" />
                  <span className="text-xs font-semibold text-gray-700">Editar</span>
                </button>
              </div>

              {/* Histórico */}
              {c.agendamentos?.length > 0 && (
                <div>
                  <p className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-violet-400" />
                    Histórico de visitas
                  </p>
                  <div className="space-y-2">
                    {c.agendamentos.map((a: Record<string, unknown>) => (
                      <div key={a.id as string} className="border border-gray-100 rounded-xl p-3 hover:border-violet-100 transition-colors">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-gray-800">
                              {formatDate(a.inicio as string, "dd/MM/yyyy 'às' HH:mm")}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {(a.servicos as Array<{servico:{nome:string}}>)?.map((s) => s.servico?.nome).filter(Boolean).join(", ")}
                            </p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              com {(a.colaborador as {user:{name:string}})?.user?.name}
                            </p>
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                            <span className="font-bold text-sm text-violet-600">{formatBRL(a.totalPrice as number)}</span>
                            <Badge className={`text-[10px] px-1.5 py-0 ${STATUS_COLORS[a.status as string] ?? "bg-gray-100 text-gray-500"}`}>
                              {STATUS_LABELS[a.status as string] ?? a.status as string}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deletar */}
              <button
                onClick={() => onDelete(c)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Remover cliente
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function ClientesView() {
  const qc = useQueryClient();

  const [search,      setSearch]      = useState("");
  const [page,        setPage]        = useState(1);
  const [selectedId,  setSelectedId]  = useState<string | null>(null);
  const [novoOpen,    setNovoOpen]    = useState(false);
  const [editCliente, setEditCliente] = useState<Record<string, unknown> | null>(null);
  const [shareCliente,setShareCliente]= useState<Record<string, unknown> | null>(null);
  const [deleteTarget,setDeleteTarget]= useState<Record<string, unknown> | null>(null);

  // ── Listagem ────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["clientes", search, page],
    queryFn: () =>
      fetch(`/api/clientes?q=${encodeURIComponent(search)}&page=${page}&limit=20`).then((r) => r.json()),
    placeholderData: (prev) => prev,
  });

  // ── Delete mutation ──────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/clientes/${id}`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Erro ao remover");
        return r.json();
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      setDeleteTarget(null);
      setSelectedId(null);
      toast.success("Cliente removido");
    },
    onError: () => toast.error("Erro ao remover cliente"),
  });

  return (
    <>
      {/* ── Barra superior ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            className="pl-9 h-10 rounded-xl border-gray-200"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          <span className="text-sm text-gray-400 hidden sm:inline">{data?.total ?? 0} clientes</span>
          <Button
            onClick={() => setNovoOpen(true)}
            className="h-10 gap-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold shadow-sm shadow-violet-200"
          >
            <Plus className="w-4 h-4" />
            Novo cliente
          </Button>
        </div>
      </div>

      {/* ── Lista ── */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
        </div>
      ) : (data?.clientes ?? []).length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-violet-200" />
          </div>
          <p className="font-semibold text-gray-500">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search ? "Tente outro termo de busca" : "Comece cadastrando o primeiro cliente"}
          </p>
          {!search && (
            <Button onClick={() => setNovoOpen(true)} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
              <UserPlus className="w-4 h-4" /> Cadastrar cliente
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {(data?.clientes ?? []).map((c: Record<string, unknown>) => {
              const user = c.user as Record<string, string>;
              const st   = statusLabel(c.totalVisitas as number);
              return (
                <div
                  key={c.id as string}
                  onClick={() => setSelectedId(c.id as string)}
                  className="bg-white border border-gray-100 rounded-2xl p-4 cursor-pointer hover:border-violet-200 hover:shadow-md hover:shadow-violet-50 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradientFor(user.name)} flex items-center justify-center text-white font-black text-sm flex-shrink-0 shadow-sm`}>
                      {getInitials(user.name)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 truncate text-sm">{user.name}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${st.color}`}>{st.label}</span>
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">{user.phone ?? user.email}</p>
                      <div className="flex items-center gap-2.5 mt-2">
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          {c.totalVisitas as number}x
                        </span>
                        <span className="text-xs font-bold text-violet-600">{formatBRL(c.totalGasto as number)}</span>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      {user.phone && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://wa.me/55${user.phone.replace(/\D/g,"")}`, "_blank");
                          }}
                          className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center hover:bg-green-100 transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); setShareCliente(c); }}
                        className="w-7 h-7 bg-violet-50 rounded-lg flex items-center justify-center hover:bg-violet-100 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5 text-violet-500" />
                      </button>
                    </div>
                  </div>

                  {c.ultimaVisita != null && (
                    <p className="text-xs text-gray-300 mt-3 pt-3 border-t border-gray-50">
                      Última visita: {formatDate(c.ultimaVisita as string)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Paginação */}
          {(data?.pages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="rounded-xl" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-sm text-gray-500">
                {page} / {data?.pages}
              </span>
              <Button variant="outline" size="sm" className="rounded-xl" disabled={page === data?.pages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* ── Perfil ── */}
      <ClientePerfil
        clienteId={selectedId}
        onClose={() => setSelectedId(null)}
        onEdit={(c) => { setSelectedId(null); setTimeout(() => setEditCliente(c), 150); }}
        onDelete={(c) => setDeleteTarget(c)}
        onShare={(c) => setShareCliente(c)}
      />

      {/* ── Criar ── */}
      <ClienteFormModal
        open={novoOpen}
        onClose={() => setNovoOpen(false)}
        onSuccess={() => {}}
      />

      {/* ── Editar ── */}
      <ClienteFormModal
        open={!!editCliente}
        onClose={() => setEditCliente(null)}
        cliente={editCliente}
        onSuccess={() => setEditCliente(null)}
      />

      {/* ── Compartilhar ── */}
      {shareCliente && (
        <ShareModal
          open={!!shareCliente}
          onClose={() => setShareCliente(null)}
          clienteName={(shareCliente.user as Record<string,string>)?.name ?? ""}
          clientePhone={(shareCliente.user as Record<string,string>)?.phone}
        />
      )}

      {/* ── Confirmar exclusão ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Remover cliente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O cliente <strong>{(deleteTarget?.user as Record<string,string>)?.name}</strong> e todos os seus dados serão removidos permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteMutation.mutate((deleteTarget as Record<string,string>).id)}
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
