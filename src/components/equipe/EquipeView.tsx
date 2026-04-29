"use client";
import { errMsg } from "@/lib/api-error";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, UserCheck, Loader2, Trash2, Clock, X, Pencil, UserX, RotateCcw, ChevronDown } from "lucide-react";
import { getInitials } from "@/lib/utils";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";
const btnPrimary =
  "flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2";
const btnOutline =
  "flex-1 py-2 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors";

function ModalShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-white rounded-xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>,
    document.body
  );
}

export function EquipeView() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [horariosModalOpen, setHorariosModalOpen] = useState(false);
  const [showInativos, setShowInativos] = useState(false);
  const [editModal, setEditModal] = useState<{ id: string; nome: string; comissaoSalaoProduto: string; comissaoProprioProduto: string; bio: string } | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [horarios, setHorarios] = useState<
    Record<number, { inicio: string; fim: string; ativo: boolean }>
  >({});

  /* ── novo profissional ── */
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [comissao, setComissao] = useState("40");
  const [password, setPassword] = useState("123456");
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  function resetForm() {
    setNome("");
    setEmail("");
    setPhone("");
    setBio("");
    setComissao("40");
    setPassword("123456");
    setFieldErrors({});
  }

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: () => fetch("/api/colaboradores").then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
  });

  async function handleCreate() {
    const errs: Record<string, string> = {};
    if (nome.trim().length < 2) errs.nome = "Mínimo 2 caracteres";
    if (!email.includes("@")) errs.email = "Email inválido";
    if (password.length < 6) errs.password = "Mínimo 6 caracteres";
    const com = parseFloat(comissao);
    if (isNaN(com) || com < 0 || com > 100) errs.comissao = "0–100";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/colaboradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: nome.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          bio: bio.trim() || undefined,
          comissao: com / 100,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(errMsg(data.error, "Erro ao adicionar"));
        return;
      }
      toast.success("Profissional adicionado!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setModalOpen(false);
      resetForm();
    } catch {
      toast.error("Erro ao adicionar");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editModal) return;
    const salon = parseFloat(editModal.comissaoSalaoProduto);
    const proprio = parseFloat(editModal.comissaoProprioProduto);
    if (isNaN(salon) || salon < 0 || salon > 100) { toast.error("Comissão produto salão deve ser entre 0 e 100"); return; }
    if (isNaN(proprio) || proprio < 0 || proprio > 100) { toast.error("Comissão produto próprio deve ser entre 0 e 100"); return; }

    setEditSubmitting(true);
    try {
      const res = await fetch(`/api/colaboradores/${editModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          comissaoSalaoProduto: salon / 100,
          comissaoProprioProduto: proprio / 100,
          bio: editModal.bio.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(errMsg(data.error, "Erro ao atualizar")); return; }
      toast.success("Profissional atualizado!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      setEditModal(null);
    } finally {
      setEditSubmitting(false);
    }
  }

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/colaboradores/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Profissional desativado");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-inativos"] });
    },
  });

  const { data: inativos = [] } = useQuery<any[]>({
    queryKey: ["colaboradores-inativos"],
    queryFn: () => fetch("/api/colaboradores?inactive=true").then((r) => r.json()),
    enabled: showInativos,
  });

  const reativarMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/colaboradores/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: true }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Profissional reativado!");
      queryClient.invalidateQueries({ queryKey: ["colaboradores"] });
      queryClient.invalidateQueries({ queryKey: ["colaboradores-inativos"] });
    },
    onError: () => toast.error("Erro ao reativar"),
  });

  const horariosMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any[] }) =>
      fetch(`/api/colaboradores/${id}/horarios`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
    onSuccess: () => {
      toast.success("Horários salvos!");
      setHorariosModalOpen(false);
    },
  });

  function openHorarios(collab: any) {
    setSelectedId(collab.id);
    const h: Record<number, { inicio: string; fim: string; ativo: boolean }> =
      {};
    [1, 2, 3, 4, 5, 6].forEach((d) => {
      const existing = collab.horarios?.find((x: any) => x.diaSemana === d);
      h[d] = existing
        ? { inicio: existing.inicio, fim: existing.fim, ativo: existing.ativo }
        : { inicio: "09:00", fim: "18:00", ativo: true };
    });
    setHorarios(h);
    setHorariosModalOpen(true);
  }

  function saveHorarios() {
    if (!selectedId) return;
    const data = Object.entries(horarios).map(([dia, h]) => ({
      diaSemana: parseInt(dia),
      ...h,
    }));
    horariosMutation.mutate({ id: selectedId, data });
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">
          {(colaboradores ?? []).length} profissional(is)
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Adicionar profissional
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (colaboradores ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <UserCheck className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">
              Nenhum profissional cadastrado
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Clique em "Adicionar profissional" para começar
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(colaboradores ?? []).map((c: any) => (
            <Card key={c.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback className="bg-violet-100 text-violet-700 font-semibold">
                      {getInitials(c.user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {c.user.name}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {c.user.email}
                    </p>
                    {c.bio && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                        {c.bio}
                      </p>
                    )}
                  </div>
                </div>

                {c.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-3">
                    {c.specialties.slice(0, 3).map((s: string) => (
                      <Badge key={s} variant="secondary" className="text-xs">
                        {s}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t gap-2">
                  <span className="text-xs text-gray-500 min-w-0 truncate">
                    Salão: <strong>{(Number(c.comissaoSalaoProduto) * 100).toFixed(0)}%</strong>
                    {" · "}
                    Próprio: <strong>{(Number(c.comissaoProprioProduto) * 100).toFixed(0)}%</strong>
                  </span>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      title="Editar"
                      onClick={() =>
                        setEditModal({
                          id: c.id,
                          nome: c.user.name,
                          comissaoSalaoProduto: (Number(c.comissaoSalaoProduto) * 100).toFixed(0),
                          comissaoProprioProduto: (Number(c.comissaoProprioProduto) * 100).toFixed(0),
                          bio: c.bio ?? "",
                        })
                      }
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-violet-100 hover:bg-violet-200 transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-violet-600" />
                    </button>
                    <button
                      type="button"
                      title="Horários"
                      onClick={() => openHorarios(c)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      <Clock className="w-3.5 h-3.5 text-gray-600" />
                    </button>
                    <button
                      type="button"
                      title="Remover"
                      onClick={() => deleteMutation.mutate(c.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ── Seção Inativos ── */}
      <div className="border-t border-gray-100 pt-4">
        <button
          type="button"
          onClick={() => setShowInativos((v) => !v)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          <UserX className="w-4 h-4" />
          Profissionais desativados
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInativos ? "rotate-180" : ""}`} />
        </button>

        {showInativos && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inativos.length === 0 ? (
              <p className="text-sm text-gray-400 col-span-full py-4 text-center">Nenhum profissional desativado</p>
            ) : inativos.map((c: any) => (
              <div key={c.id} className="flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl p-3 opacity-70">
                <div className="w-9 h-9 rounded-lg bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-sm flex-shrink-0">
                  {getInitials(c.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-600 truncate">{c.user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{c.user.email}</p>
                </div>
                <button
                  type="button"
                  title="Reativar"
                  onClick={() => reativarMutation.mutate(c.id)}
                  disabled={reativarMutation.isPending}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors flex-shrink-0 disabled:opacity-50"
                >
                  {reativarMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    : <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal: Novo Profissional ── */}
      {modalOpen && (
        <ModalShell
          title="Novo Profissional"
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Nome *
                </label>
                <input
                  type="text"
                  placeholder="João Silva"
                  value={nome}
                  onChange={(e) => {
                    setNome(e.target.value);
                    setFieldErrors((er) => ({ ...er, nome: "" }));
                  }}
                  className={inputCls}
                />
                {fieldErrors.nome && (
                  <p className="text-xs text-red-500 mt-1">{fieldErrors.nome}</p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  WhatsApp
                </label>
                <input
                  type="text"
                  placeholder="(11) 9xxxx-xxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Email *
              </label>
              <input
                type="email"
                placeholder="joao@exemplo.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((er) => ({ ...er, email: "" }));
                }}
                className={inputCls}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Senha inicial *
                </label>
                <input
                  type="text"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setFieldErrors((er) => ({ ...er, password: "" }));
                  }}
                  className={inputCls}
                />
                {fieldErrors.password && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.password}
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Comissão (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={comissao}
                  onChange={(e) => {
                    setComissao(e.target.value);
                    setFieldErrors((er) => ({ ...er, comissao: "" }));
                  }}
                  className={inputCls}
                />
                {fieldErrors.comissao && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.comissao}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Bio (opcional)
              </label>
              <input
                type="text"
                placeholder="Especialidade, experiência..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={inputCls}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className={btnOutline}
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={submitting}
                onClick={handleCreate}
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Adicionar
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Modal: Horários ── */}
      {horariosModalOpen && (
        <ModalShell
          title="Horários de Trabalho"
          onClose={() => setHorariosModalOpen(false)}
        >
          <div className="space-y-2">
            {[1, 2, 3, 4, 5, 6].map((dia) => (
              <div key={dia} className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={horarios[dia]?.ativo ?? true}
                  onChange={(e) =>
                    setHorarios((prev) => ({
                      ...prev,
                      [dia]: { ...prev[dia], ativo: e.target.checked },
                    }))
                  }
                  className="w-4 h-4 accent-violet-600"
                />
                <span className="w-8 text-sm font-medium text-gray-600">
                  {DIAS[dia]}
                </span>
                <input
                  type="time"
                  value={horarios[dia]?.inicio ?? "09:00"}
                  disabled={!horarios[dia]?.ativo}
                  onChange={(e) =>
                    setHorarios((prev) => ({
                      ...prev,
                      [dia]: { ...prev[dia], inicio: e.target.value },
                    }))
                  }
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-40 bg-white"
                />
                <span className="text-gray-400 text-sm">às</span>
                <input
                  type="time"
                  value={horarios[dia]?.fim ?? "18:00"}
                  disabled={!horarios[dia]?.ativo}
                  onChange={(e) =>
                    setHorarios((prev) => ({
                      ...prev,
                      [dia]: { ...prev[dia], fim: e.target.value },
                    }))
                  }
                  className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-40 bg-white"
                />
              </div>
            ))}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                className={btnOutline}
                onClick={() => setHorariosModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={horariosMutation.isPending}
                onClick={saveHorarios}
              >
                {horariosMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Salvar horários
              </button>
            </div>
          </div>
        </ModalShell>
      )}

      {/* ── Modal: Editar Profissional ── */}
      {editModal && (
        <ModalShell
          title={`Editar — ${editModal.nome}`}
          onClose={() => setEditModal(null)}
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Comissão prod. salão (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editModal.comissaoSalaoProduto}
                  onChange={(e) =>
                    setEditModal((prev) => prev && { ...prev, comissaoSalaoProduto: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Comissão prod. próprio (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="1"
                  value={editModal.comissaoProprioProduto}
                  onChange={(e) =>
                    setEditModal((prev) => prev && { ...prev, comissaoProprioProduto: e.target.value })
                  }
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 -mt-2">
              % aplicada sobre o valor do serviço ao concluir o atendimento
            </p>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Bio / Especialidade
              </label>
              <input
                type="text"
                placeholder="Ex: Especialista em colorimetria"
                value={editModal.bio}
                onChange={(e) =>
                  setEditModal((prev) => prev && { ...prev, bio: e.target.value })
                }
                className={inputCls}
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                className={btnOutline}
                onClick={() => setEditModal(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={btnPrimary}
                disabled={editSubmitting}
                onClick={handleEdit}
              >
                {editSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar
              </button>
            </div>
          </div>
        </ModalShell>
      )}
    </>
  );
}
