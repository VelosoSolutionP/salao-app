"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Loader2, Building2, TrendingUp, CalendarDays, Users,
  DollarSign, ChevronDown, ChevronUp, MapPin, Pencil, Trash2,
  Network, ArrowUpRight,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

const inputCls =
  "w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white transition-all";

export function RedeView() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [editingRede, setEditingRede] = useState<{ id: string; nome: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addSalonModal, setAddSalonModal] = useState<string | null>(null);

  const [nome, setNome] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: redes = [], isLoading } = useQuery({
    queryKey: ["redes"],
    queryFn: () => fetch("/api/rede").then((r) => r.json()),
  });

  const { data: redeDetail } = useQuery({
    queryKey: ["rede-detail", expandedId],
    queryFn: () => fetch(`/api/rede/${expandedId}`).then((r) => r.json()),
    enabled: !!expandedId,
  });

  const { data: allSalons = [] } = useQuery({
    queryKey: ["all-salons"],
    queryFn: () => fetch("/api/saloes").then((r) => r.json()),
    enabled: !!addSalonModal,
  });

  async function handleCreate() {
    if (!nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/rede", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: nome.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao criar rede"); return; }
      toast.success("Rede criada!");
      queryClient.invalidateQueries({ queryKey: ["redes"] });
      setCreateOpen(false);
      setNome("");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEdit() {
    if (!editingRede || !editingRede.nome.trim()) { toast.error("Nome obrigatório"); return; }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/rede/${editingRede.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: editingRede.nome.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao atualizar rede"); return; }
      toast.success("Rede atualizada!");
      queryClient.invalidateQueries({ queryKey: ["redes"] });
      setEditingRede(null);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/rede/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Rede removida");
      queryClient.invalidateQueries({ queryKey: ["redes"] });
      if (expandedId === id) setExpandedId(null);
    }
    setDeletingId(null);
  }

  async function handleAddSalon(redeId: string, salonId: string) {
    const res = await fetch(`/api/rede/${redeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ addSalonIds: [salonId] }),
    });
    if (res.ok) {
      toast.success("Unidade adicionada!");
      queryClient.invalidateQueries({ queryKey: ["redes"] });
      queryClient.invalidateQueries({ queryKey: ["rede-detail", redeId] });
      setAddSalonModal(null);
    }
  }

  async function handleRemoveSalon(redeId: string, salonId: string) {
    const res = await fetch(`/api/rede/${redeId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeSalonIds: [salonId] }),
    });
    if (res.ok) {
      toast.success("Unidade removida");
      queryClient.invalidateQueries({ queryKey: ["redes"] });
      queryClient.invalidateQueries({ queryKey: ["rede-detail", redeId] });
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{redes.length}</span> rede(s) configurada(s)
        </p>
        <Button
          onClick={() => { setNome(""); setCreateOpen(true); }}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200"
        >
          <Plus className="w-4 h-4" /> Nova rede
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : redes.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
            <Network className="w-8 h-8 text-violet-300" />
          </div>
          <p className="font-semibold text-gray-700">Nenhuma rede configurada</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs">
            Agrupe seus salões para visualizar métricas consolidadas de todas as unidades
          </p>
          <Button onClick={() => { setNome(""); setCreateOpen(true); }} className="mt-5 gap-2">
            <Plus className="w-4 h-4" /> Criar rede
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {redes.map((rede: any) => {
            const isExpanded = expandedId === rede.id;
            const detail = isExpanded ? redeDetail : null;
            const unidades = rede.salons?.length ?? 0;

            return (
              <div key={rede.id} className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-5 py-4 text-white relative overflow-hidden">
                  <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
                  <div className="flex items-center justify-between relative">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white/15 rounded-xl flex items-center justify-center flex-shrink-0">
                        <Network className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-black text-base">{rede.nome}</p>
                        <p className="text-white/70 text-xs">
                          {unidades} unidade{unidades !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditingRede({ id: rede.id, nome: rede.nome })}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-white/25 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingId(rede.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/15 hover:bg-red-500/50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-white" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : rede.id)}
                        className="flex items-center gap-1 ml-1 bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-3 py-1.5 text-xs font-semibold text-white"
                      >
                        {isExpanded ? "Fechar" : "Detalhes"}
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="p-5 space-y-5">
                    {detail?.metrics && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { icon: DollarSign, label: "Receita do mês", value: formatBRL(detail.metrics.receitaMes), color: "text-emerald-600", bg: "bg-emerald-50" },
                          { icon: CalendarDays, label: "Agend. hoje", value: detail.metrics.agendamentosHoje, color: "text-blue-600", bg: "bg-blue-50" },
                          { icon: TrendingUp, label: "Atend./mês", value: detail.metrics.agendamentosMes, color: "text-violet-600", bg: "bg-violet-50" },
                          { icon: Users, label: "Clientes", value: detail.metrics.clientesTotal, color: "text-pink-600", bg: "bg-pink-50" },
                        ].map(({ icon: Icon, label, value, color, bg }) => (
                          <div key={label} className={`${bg} rounded-2xl p-3 text-center`}>
                            <Icon className={`w-4 h-4 ${color} mx-auto mb-1`} />
                            <p className={`text-lg font-black ${color}`}>{value}</p>
                            <p className="text-[10px] text-gray-500">{label}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-bold text-gray-700">Unidades</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-violet-600 border-violet-200 hover:bg-violet-50"
                          onClick={() => setAddSalonModal(rede.id)}
                        >
                          <Plus className="w-3.5 h-3.5" /> Adicionar
                        </Button>
                      </div>

                      {!detail?.salonMetrics ? (
                        <div className="flex justify-center py-6">
                          <Loader2 className="w-5 h-5 animate-spin text-gray-300" />
                        </div>
                      ) : detail.salonMetrics.length === 0 ? (
                        <p className="text-sm text-gray-400 text-center py-6">
                          Nenhuma unidade nesta rede ainda
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {detail.salonMetrics.map((s: any) => (
                            <div
                              key={s.id}
                              className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100/80 transition-colors group"
                            >
                              <div className="w-9 h-9 bg-white rounded-xl border border-gray-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Building2 className="w-4 h-4 text-gray-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                {s.city && (
                                  <p className="text-xs text-gray-400 flex items-center gap-0.5">
                                    <MapPin className="w-3 h-3" /> {s.city}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-4 text-right flex-shrink-0">
                                <div>
                                  <p className="text-xs font-bold text-emerald-600">{formatBRL(s.receitaMes)}</p>
                                  <p className="text-[10px] text-gray-400">mês</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-blue-600">{s.agendamentosHoje}</p>
                                  <p className="text-[10px] text-gray-400">hoje</p>
                                </div>
                                <div>
                                  <p className="text-xs font-bold text-gray-700">{s.clientes}</p>
                                  <p className="text-[10px] text-gray-400">clientes</p>
                                </div>
                                <Badge
                                  variant={s.active ? "default" : "secondary"}
                                  className="text-[10px] hidden sm:inline-flex"
                                >
                                  {s.active ? "Ativo" : "Inativo"}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSalon(rede.id, s.id)}
                                  className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity font-medium flex items-center gap-1"
                                >
                                  <ArrowUpRight className="w-3 h-3" /> Remover
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar */}
      <Dialog open={createOpen} onOpenChange={(o) => { if (!o) setCreateOpen(false); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Nova Rede de Salões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nome da rede *</label>
              <input type="text" placeholder="Rede Bellefy SP" value={nome}
                onChange={(e) => setNome(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                disabled={submitting}
                onClick={handleCreate}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar rede
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal editar */}
      <Dialog open={!!editingRede} onOpenChange={(o) => { if (!o) setEditingRede(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Rede</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1.5">Nome da rede *</label>
              <input
                type="text"
                value={editingRede?.nome ?? ""}
                onChange={(e) => setEditingRede((prev) => prev ? { ...prev, nome: e.target.value } : null)}
                className={inputCls}
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setEditingRede(null)}>Cancelar</Button>
              <Button
                className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600"
                disabled={submitting}
                onClick={handleEdit}
              >
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir rede?</AlertDialogTitle>
            <AlertDialogDescription>
              A rede será desativada. Os salões vinculados não serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && handleDelete(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal adicionar unidade */}
      <Dialog open={!!addSalonModal} onOpenChange={(o) => { if (!o) setAddSalonModal(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Unidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2 max-h-72 overflow-y-auto">
            {(Array.isArray(allSalons) ? allSalons : allSalons?.salons ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-semibold text-gray-900">{s.name}</p>
                  {s.city && <p className="text-xs text-gray-400">{s.city}</p>}
                </div>
                <Button size="sm" variant="outline"
                  className="text-violet-600 border-violet-200 hover:bg-violet-50"
                  onClick={() => handleAddSalon(addSalonModal!, s.id)}>
                  Adicionar
                </Button>
              </div>
            ))}
            {(Array.isArray(allSalons) ? allSalons : allSalons?.salons ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-6">Nenhum salão disponível</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
