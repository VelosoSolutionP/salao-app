"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Plus, Loader2, Trash2, Users, Star, Calendar, X,
} from "lucide-react";
import { formatBRL, getInitials } from "@/lib/utils";

const PERIODICIDADE_LABEL: Record<string, string> = {
  SEMANAL: "Semanal",
  QUINZENAL: "Quinzenal",
  MENSAL: "Mensal",
};

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white";

export function PlanosView() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [enrollModal, setEnrollModal] = useState<string | null>(null); // planoId
  const [selectedClienteId, setSelectedClienteId] = useState("");

  // Create plan form
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [periodicidade, setPeriodicidade] = useState<"SEMANAL" | "QUINZENAL" | "MENSAL">("MENSAL");
  const [qtdAtendimentos, setQtdAtendimentos] = useState("4");
  const [valor, setValor] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    setNome(""); setDescricao(""); setPeriodicidade("MENSAL");
    setQtdAtendimentos("4"); setValor("");
  }

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

  async function handleCreate() {
    const v = parseFloat(valor);
    if (!nome.trim()) { toast.error("Nome obrigatório"); return; }
    if (isNaN(v) || v <= 0) { toast.error("Valor inválido"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/planos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome: nome.trim(),
          descricao: descricao.trim() || undefined,
          periodicidade,
          qtdAtendimentos: parseInt(qtdAtendimentos),
          valor: v,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao criar plano"); return; }
      toast.success("Plano criado!");
      queryClient.invalidateQueries({ queryKey: ["planos"] });
      setModalOpen(false);
      resetForm();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/planos/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Plano desativado");
      queryClient.invalidateQueries({ queryKey: ["planos"] });
    }
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

  return (
    <>
      <Tabs defaultValue="planos">
        <TabsList>
          <TabsTrigger value="planos">Planos</TabsTrigger>
          <TabsTrigger value="assinantes">Assinantes ({clientesPlano.length})</TabsTrigger>
        </TabsList>

        {/* ── Planos ── */}
        <TabsContent value="planos" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => setModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" /> Novo plano
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
          ) : planos.length === 0 ? (
            <Card><CardContent className="flex flex-col items-center py-16">
              <Star className="w-12 h-12 text-gray-200 mb-3" />
              <p className="text-gray-500 font-medium">Nenhum plano cadastrado</p>
              <p className="text-sm text-gray-400 mt-1">Crie planos mensais para fidelizar seus clientes</p>
            </CardContent></Card>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {planos.map((p: any) => (
                <Card key={p.id} className={p.ativo ? "" : "opacity-50"}>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <p className="font-bold text-gray-900">{p.nome}</p>
                        {p.descricao && <p className="text-xs text-gray-400 mt-0.5">{p.descricao}</p>}
                      </div>
                      <Badge variant={p.ativo ? "default" : "secondary"} className="text-xs">
                        {p.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {PERIODICIDADE_LABEL[p.periodicidade]}
                        </span>
                        <span className="font-semibold text-gray-700">
                          {p.qtdAtendimentos}× atendimento{p.qtdAtendimentos > 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" />
                          Assinantes
                        </span>
                        <span className="font-semibold text-gray-700">{p._count?.clientesPlano ?? 0}</span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t flex items-center justify-between">
                      <p className="text-2xl font-black text-violet-600">{formatBRL(p.valor)}</p>
                      <div className="flex gap-1">
                        {p.ativo && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEnrollModal(p.id)}
                          >
                            <Users className="w-3.5 h-3.5 mr-1" /> Vincular
                          </Button>
                        )}
                        {p.ativo && (
                          <button
                            type="button"
                            onClick={() => handleDeactivate(p.id)}
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-400" />
                          </button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Assinantes ── */}
        <TabsContent value="assinantes" className="mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Clientes com Plano Ativo</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {clientesPlano.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-8">Nenhum cliente vinculado a um plano</p>
              ) : (
                <div className="divide-y">
                  {clientesPlano.map((cp: any) => (
                    <div key={cp.id} className="flex items-center gap-3 px-4 py-3">
                      <Avatar className="w-9 h-9">
                        <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                          {getInitials(cp.cliente?.user?.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {cp.cliente?.user?.name ?? "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {cp.plano?.nome} · {cp.atendimentosUsados}/{cp.plano?.qtdAtendimentos} atend. usados
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-400">
                          Até {format(new Date(cp.dataFim), "dd/MM/yyyy")}
                        </p>
                        <p className="text-xs font-semibold text-violet-600">
                          {formatBRL(cp.plano?.valor ?? 0)}/{PERIODICIDADE_LABEL[cp.plano?.periodicidade ?? "MENSAL"]?.toLowerCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCancelEnroll(cp.id)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 ml-1"
                        title="Cancelar"
                      >
                        <X className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal criar plano */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Plano de Fidelidade</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome *</label>
              <input type="text" placeholder="Plano Mensal VIP" value={nome}
                onChange={(e) => setNome(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
              <input type="text" placeholder="Descrição opcional" value={descricao}
                onChange={(e) => setDescricao(e.target.value)} className={inputCls} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Periodicidade</label>
                <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value as any)} className={inputCls}>
                  <option value="SEMANAL">Semanal</option>
                  <option value="QUINZENAL">Quinzenal</option>
                  <option value="MENSAL">Mensal</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Atend. incluídos</label>
                <input type="number" min="1" max="30" value={qtdAtendimentos}
                  onChange={(e) => setQtdAtendimentos(e.target.value)} className={inputCls} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Valor (R$) *</label>
              <input type="number" min="0" step="0.01" placeholder="99,90" value={valor}
                onChange={(e) => setValor(e.target.value)} className={inputCls} />
            </div>
            <div className="flex gap-3 pt-1">
              <Button variant="outline" className="flex-1"
                onClick={() => { setModalOpen(false); resetForm(); }}>Cancelar</Button>
              <Button className="flex-1" disabled={submitting} onClick={handleCreate}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Criar plano
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal vincular cliente */}
      <Dialog open={!!enrollModal} onOpenChange={(o) => { if (!o) { setEnrollModal(null); setSelectedClienteId(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Vincular Cliente ao Plano</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Selecione o cliente</label>
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
                onClick={() => { setEnrollModal(null); setSelectedClienteId(""); }}>Cancelar</Button>
              <Button className="flex-1" disabled={!selectedClienteId} onClick={handleEnroll}>
                Vincular
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
