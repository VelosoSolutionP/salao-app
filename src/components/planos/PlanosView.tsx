"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Plus, Loader2, Star, Calendar, Users, Pencil, Trash2, X, Crown,
  Repeat2, CheckCircle2, UserPlus,
} from "lucide-react";
import { formatBRL, getInitials } from "@/lib/utils";

const PERIODICIDADE_LABEL: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
};

const PERIODICIDADE_COLOR: Record<string, string> = {
  SEMANAL: "from-blue-500 to-cyan-500",
  QUINZENAL: "from-violet-500 to-purple-600",
  MENSAL: "from-emerald-500 to-teal-600",
};

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white transition-all";

type Periodicidade = "SEMANAL" | "QUINZENAL" | "MENSAL";

interface PlanoForm {
  nome: string;
  descricao: string;
  periodicidade: Periodicidade;
  qtdAtendimentos: string;
  valor: string;
}

const EMPTY_FORM: PlanoForm = {
  nome: "", descricao: "", periodicidade: "MENSAL", qtdAtendimentos: "4", valor: "",
};

export function PlanosView() {
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [enrollModal, setEnrollModal] = useState<string | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState("");
  const [form, setForm] = useState<PlanoForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const { data: planos = [], isLoading } = useQuery({
    queryKey: ["planos"],
    queryFn: () => fetch("/api/planos").then((r) => r.json()),
  });

  const { data: clientesPlano = [] } = useQuery({
    queryKey: ["clientes-plano"],
    queryFn: () => fetch("/api/planos/clientes?ativo=true").then((r) => r.json()),
  });

  const { data: clientes = [] } = useQuery({
    queryKey: ["clientes-lista"],
    queryFn: () => fetch("/api/clientes").then((r) => r.json()),
  });

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(p: any) {
    setEditingId(p.id);
    setForm({
      nome: p.nome,
      descricao: p.descricao ?? "",
      periodicidade: p.periodicidade,
      qtdAtendimentos: String(p.qtdAtendimentos),
      valor: String(p.valor),
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function handleSubmit() {
    const v = parseFloat(form.valor);
    if (!form.nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (isNaN(v) || v <= 0) { toast.error("Valor inválido"); return; }

    setSubmitting(true);
    try {
      const url = editingId ? `/api/planos/${editingId}` : "/api/planos";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: form.nome.trim(),
          descricao: form.descricao.trim() || undefined,
          periodicidade: form.periodicidade,
          qtdAtendimentos: parseInt(form.qtdAtendimentos),
          valor: v,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao salvar plano"); return; }
      toast.success(editingId ? "Plano atualizado!" : "Plano criado!");
      queryClient.invalidateQueries({ queryKey: ["planos"] });
      closeModal();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/planos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Plano desativado");
      queryClient.invalidateQueries({ queryKey: ["planos"] });
    }
    setDeletingId(null);
  }

  async function handleEnroll() {
    if (!enrollModal || !selectedClienteId) return;
    const res = await fetch("/api/planos/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clienteId: selectedClienteId, planoId: enrollModal }),
    });
    const json = await res.json();
    if (!res.ok) { toast.error(json.error ?? "Erro ao vincular"); return; }
    toast.success("Cliente vinculado ao plano!");
    queryClient.invalidateQueries({ queryKey: ["clientes-plano"] });
    setEnrollModal(null);
    setSelectedClienteId("");
  }

  async function handleCancelEnroll(id: string) {
    const res = await fetch(`/api/planos/clientes?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Assinatura cancelada");
      queryClient.invalidateQueries({ queryKey: ["clientes-plano"] });
    }
  }

  const field = (key: keyof PlanoForm) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value })),
  });

  return (
    <>
      <Tabs defaultValue="planos">
        <div className="flex items-center justify-between mb-4">
          <TabsList className="bg-gray-100">
            <TabsTrigger value="planos" className="gap-1.5">
              <Crown className="w-3.5 h-3.5" /> Planos
            </TabsTrigger>
            <TabsTrigger value="assinantes" className="gap-1.5">
              <Users className="w-3.5 h-3.5" /> Assinantes{" "}
              <span className="bg-violet-100 text-violet-700 rounded-full px-1.5 py-0 text-[10px] font-bold">
                {clientesPlano.length}
              </span>
            </TabsTrigger>
          </TabsList>
          <Button onClick={openCreate} className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200">
            <Plus className="w-4 h-4" /> Novo plano
          </Button>
        </div>

        {/* ── Planos ── */}
        <TabsContent value="planos" className="mt-0 space-y-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
            </div>
          ) : planos.length === 0 ? (
            <div className="flex flex-col items-center py-20 text-center">
              <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <Crown className="w-8 h-8 text-violet-300" />
              </div>
              <p className="font-semibold text-gray-700">Nenhum plano cadastrado</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                Crie planos de fidelidade para reter seus clientes e garantir receita recorrente
              </p>
              <Button onClick={openCreate} className="mt-5 gap-2">
                <Plus className="w-4 h-4" /> Criar primeiro plano
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {planos.map((p: any) => {
                const gradient = PERIODICIDADE_COLOR[p.periodicidade] ?? "from-gray-400 to-gray-500";
                return (
                  <div
                    key={p.id}
                    className={`rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!p.ativo ? "opacity-50" : ""}`}
                  >
                    {/* Gradient top bar */}
                    <div className={`bg-gradient-to-r ${gradient} p-5 text-white relative overflow-hidden`}>
                      <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                      <div className="flex items-start justify-between relative">
                        <div>
                          <p className="font-black text-lg leading-tight">{p.nome}</p>
                          {p.descricao && (
                            <p className="text-white/75 text-xs mt-0.5 line-clamp-1">{p.descricao}</p>
                          )}
                        </div>
                        <Badge className="bg-white/20 text-white border-0 text-[10px] font-bold">
                          {p.ativo ? "Ativo" : "Inativo"}
                        </Badge>
                      </div>
                      <p className="text-3xl font-black mt-3">{formatBRL(p.valor)}</p>
                      <p className="text-white/70 text-xs">por período</p>
                    </div>

                    {/* Body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Repeat2 className="w-4 h-4" />
                          <span>{PERIODICIDADE_LABEL[p.periodicidade]}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <CheckCircle2 className="w-4 h-4" />
                          <span className="font-semibold text-gray-700">
                            {p.qtdAtendimentos}× atend.
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <Users className="w-4 h-4" />
                          <span className="font-semibold text-gray-700">{p._count?.clientesPlano ?? 0}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        {p.ativo && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                            onClick={() => setEnrollModal(p.id)}
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Vincular
                          </Button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-3.5 h-3.5 text-gray-400" />
                        </button>
                        {p.ativo && (
                          <button
                            type="button"
                            onClick={() => setDeletingId(p.id)}
                            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                            title="Desativar"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Assinantes ── */}
        <TabsContent value="assinantes" className="mt-0">
          {clientesPlano.length === 0 ? (
            <div className="flex flex-col items-center py-16 text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
                <Users className="w-7 h-7 text-gray-300" />
              </div>
              <p className="font-semibold text-gray-600">Nenhum assinante ativo</p>
              <p className="text-sm text-gray-400 mt-1">Vincule clientes aos planos de fidelidade</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-gray-100 overflow-hidden bg-white shadow-sm">
              <div className="divide-y divide-gray-50">
                {clientesPlano.map((cp: any) => (
                  <div key={cp.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50/50 transition-colors">
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-bold">
                        {getInitials(cp.cliente?.user?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {cp.cliente?.user?.name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {cp.plano?.nome} · {cp.atendimentosUsados}/{cp.plano?.qtdAtendimentos} atend.
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-bold text-violet-600">
                        {formatBRL(cp.plano?.valor ?? 0)}
                        <span className="text-gray-400 font-normal">/{PERIODICIDADE_LABEL[cp.plano?.periodicidade ?? "MENSAL"]?.toLowerCase()}</span>
                      </p>
                      <p className="text-[11px] text-gray-400">
                        até {format(new Date(cp.dataFim), "dd/MM/yy", { locale: ptBR })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelEnroll(cp.id)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-red-50 ml-1 transition-colors"
                      title="Cancelar assinatura"
                    >
                      <X className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal criar / editar */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Plano" : "Novo Plano de Fidelidade"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nome *</label>
              <input type="text" placeholder="Plano Mensal VIP" {...field("nome")} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Descrição</label>
              <input type="text" placeholder="Descrição opcional" {...field("descricao")} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Periodicidade</label>
                <select {...field("periodicidade")} className={inputCls}>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1.5">Atendimentos</label>
                <input type="number" min="1" max="30" {...field("qtdAtendimentos")} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" placeholder="99,90" {...field("valor")} className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                disabled={submitting}
                onClick={handleSubmit}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Salvar" : "Criar plano"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar desativação */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar plano?</AlertDialogTitle>
            <AlertDialogDescription>
              O plano ficará inativo. Assinantes existentes não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal vincular cliente */}
      <Dialog open={!!enrollModal} onOpenChange={(o) => { if (!o) { setEnrollModal(null); setSelectedClienteId(""); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Vincular Cliente ao Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Selecione o cliente</label>
              <select
                value={selectedClienteId}
                onChange={(e) => setSelectedClienteId(e.target.value)}
                className={inputCls}
              >
                <option value="">— Selecione —</option>
                {(clientes?.clientes ?? clientes ?? []).map((c: any) => (
                  <option key={c.id} value={c.id}>{c.user?.name ?? c.nome}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1"
                onClick={() => { setEnrollModal(null); setSelectedClienteId(""); }}>
                Cancelar
              </Button>
              <Button className="flex-1" disabled={!selectedClienteId} onClick={handleEnroll}>
                <UserPlus className="w-4 h-4 mr-1.5" /> Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
