"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Plus, Loader2, Building2, TrendingUp, CalendarDays, Users,
  DollarSign, ChevronDown, ChevronUp, MapPin,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";

export function RedeView() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addSalonModal, setAddSalonModal] = useState<string | null>(null);

  // Form state
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

  // All salons of this owner (to add to a network)
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
      setModalOpen(false);
      setNome("");
    } finally {
      setSubmitting(false);
    }
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
      <div className="flex justify-end">
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Nova rede
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : redes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Building2 className="w-14 h-14 text-gray-200 mb-3" />
            <p className="font-semibold text-gray-500">Nenhuma rede configurada</p>
            <p className="text-sm text-gray-400 mt-1 text-center max-w-xs">
              Agrupe seus salões em uma rede para visualizar métricas consolidadas de todas as unidades
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {redes.map((rede: any) => {
            const isExpanded = expandedId === rede.id;
            const detail = isExpanded ? redeDetail : null;

            return (
              <Card key={rede.id}>
                <CardContent className="p-5">
                  {/* Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-violet-600" />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{rede.nome}</p>
                        <p className="text-xs text-gray-400">
                          {rede.salons?.length ?? 0} unidade{(rede.salons?.length ?? 0) !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setExpandedId(isExpanded ? null : rede.id);
                      }}
                      className="flex items-center gap-1.5 text-sm text-violet-600 font-semibold hover:text-violet-700"
                    >
                      {isExpanded ? "Fechar" : "Ver detalhes"}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Expanded view */}
                  {isExpanded && (
                    <div className="mt-5 space-y-4">
                      {/* Consolidated KPIs */}
                      {detail?.metrics && (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-green-50 rounded-xl p-3 text-center">
                            <DollarSign className="w-4 h-4 text-green-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-green-700">{formatBRL(detail.metrics.receitaMes)}</p>
                            <p className="text-[10px] text-gray-500">Receita do mês</p>
                          </div>
                          <div className="bg-blue-50 rounded-xl p-3 text-center">
                            <CalendarDays className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-blue-700">{detail.metrics.agendamentosHoje}</p>
                            <p className="text-[10px] text-gray-500">Agendamentos hoje</p>
                          </div>
                          <div className="bg-violet-50 rounded-xl p-3 text-center">
                            <TrendingUp className="w-4 h-4 text-violet-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-violet-700">{detail.metrics.agendamentosMes}</p>
                            <p className="text-[10px] text-gray-500">Atendimentos/mês</p>
                          </div>
                          <div className="bg-pink-50 rounded-xl p-3 text-center">
                            <Users className="w-4 h-4 text-pink-600 mx-auto mb-1" />
                            <p className="text-lg font-black text-pink-700">{detail.metrics.clientesTotal}</p>
                            <p className="text-[10px] text-gray-500">Clientes total</p>
                          </div>
                        </div>
                      )}

                      {/* Per-salon metrics */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-bold text-gray-700">Unidades</h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAddSalonModal(rede.id)}
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar unidade
                          </Button>
                        </div>

                        {!detail?.salonMetrics ? (
                          <div className="flex justify-center py-4">
                            <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                          </div>
                        ) : detail.salonMetrics.length === 0 ? (
                          <p className="text-sm text-gray-400 text-center py-4">
                            Nenhuma unidade nesta rede
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {detail.salonMetrics.map((s: any) => (
                              <div
                                key={s.id}
                                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                              >
                                <div className="w-8 h-8 bg-white rounded-lg border flex items-center justify-center flex-shrink-0">
                                  <Building2 className="w-4 h-4 text-gray-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 truncate">{s.name}</p>
                                  {s.city && (
                                    <p className="text-xs text-gray-400 flex items-center gap-0.5">
                                      <MapPin className="w-3 h-3" />{s.city}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-right flex-shrink-0">
                                  <div>
                                    <p className="text-xs font-bold text-green-600">{formatBRL(s.receitaMes)}</p>
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
                                  <Badge variant={s.active ? "default" : "secondary"} className="text-[10px]">
                                    {s.active ? "Ativo" : "Inativo"}
                                  </Badge>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSalon(rede.id, s.id)}
                                    className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal criar rede */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) setModalOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Rede de Salões</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome da rede *</label>
              <input type="text" placeholder="Rede Bellefy" value={nome}
                onChange={(e) => setNome(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button className="flex-1" disabled={submitting} onClick={handleCreate}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar rede
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal adicionar unidade */}
      <Dialog open={!!addSalonModal} onOpenChange={(o) => { if (!o) setAddSalonModal(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Unidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 mt-2">
            {(Array.isArray(allSalons) ? allSalons : allSalons?.salons ?? []).map((s: any) => (
              <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="text-sm font-semibold">{s.name}</p>
                  {s.city && <p className="text-xs text-gray-400">{s.city}</p>}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddSalon(addSalonModal!, s.id)}
                >
                  Adicionar
                </Button>
              </div>
            ))}
            {(Array.isArray(allSalons) ? allSalons : allSalons?.salons ?? []).length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum salão disponível</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
