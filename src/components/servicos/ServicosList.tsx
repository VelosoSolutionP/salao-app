"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Scissors, Loader2 } from "lucide-react";
import { formatBRL, minutesToHuman } from "@/lib/utils";

export function ServicosList() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* ── form state ── */
  const [nome, setNome]           = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco]         = useState("");
  const [duracao, setDuracao]     = useState("30");
  const [categoria, setCategoria] = useState("");

  function resetForm() {
    setNome(""); setDescricao(""); setPreco(""); setDuracao("30"); setCategoria("");
    setFieldErrors({});
  }

  const { data: servicos, isLoading } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => fetch("/api/servicos").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/servicos/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Serviço removido");
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      setDeletingId(null);
    },
  });

  function openEdit(servico: any) {
    setNome(servico.nome ?? "");
    setDescricao(servico.descricao ?? "");
    setPreco(String(Number(servico.preco)));
    setDuracao(String(servico.duracao));
    setCategoria(servico.categoria ?? "");
    setFieldErrors({});
    setEditingId(servico.id);
    setModalOpen(true);
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!nome.trim()) errs.nome = "Nome obrigatório";
    const precoNum = parseFloat(preco);
    if (isNaN(precoNum) || precoNum <= 0) errs.preco = "Deve ser positivo";
    const duracaoNum = parseInt(duracao);
    if (isNaN(duracaoNum) || duracaoNum <= 0) errs.duracao = "Deve ser positivo";
    if (Object.keys(errs).length > 0) { setFieldErrors(errs); return; }

    setSubmitting(true);
    try {
      const url    = editingId ? `/api/servicos/${editingId}` : "/api/servicos";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome:      nome.trim(),
          descricao: descricao.trim() || undefined,
          preco:     precoNum,
          duracao:   duracaoNum,
          categoria: categoria.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) { toast.error(data.error ?? "Erro ao salvar"); return; }
      toast.success(editingId ? "Serviço atualizado!" : "Serviço criado!");
      queryClient.invalidateQueries({ queryKey: ["servicos"] });
      setModalOpen(false);
      setEditingId(null);
      resetForm();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSubmitting(false);
    }
  }

  const categorias = [...new Set((servicos ?? []).map((s: any) => s.categoria).filter(Boolean))];

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {(servicos ?? []).length} serviço(s) cadastrado(s)
        </p>
        <Button
          onClick={() => {
            setEditingId(null);
            resetForm();
            setModalOpen(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo serviço
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (servicos ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Scissors className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500 font-medium">Nenhum serviço cadastrado</p>
            <p className="text-gray-400 text-sm">Crie o primeiro serviço do seu salão</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(servicos ?? []).map((s: any) => (
            <Card key={s.id} className="relative group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{s.nome}</p>
                    {s.categoria && (
                      <Badge variant="secondary" className="text-xs mt-1">
                        {s.categoria}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(s)}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-red-400 hover:text-red-600"
                      onClick={() => setDeletingId(s.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {s.descricao && (
                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{s.descricao}</p>
                )}
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-sm text-gray-500">{minutesToHuman(s.duracao)}</span>
                  <span className="font-bold text-violet-600">{formatBRL(s.preco)}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) { setModalOpen(false); setEditingId(null); resetForm(); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome do serviço</label>
              <input
                type="text"
                placeholder="Corte masculino"
                value={nome}
                onChange={(e) => { setNome(e.target.value); setFieldErrors((er) => ({ ...er, nome: "" })); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              {fieldErrors.nome && <p className="text-xs text-red-500 mt-1">{fieldErrors.nome}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Preço (R$)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="35.00"
                  value={preco}
                  onChange={(e) => { setPreco(e.target.value); setFieldErrors((er) => ({ ...er, preco: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                {fieldErrors.preco && <p className="text-xs text-red-500 mt-1">{fieldErrors.preco}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Duração (min)</label>
                <input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="30"
                  value={duracao}
                  onChange={(e) => { setDuracao(e.target.value); setFieldErrors((er) => ({ ...er, duracao: "" })); }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                {fieldErrors.duracao && <p className="text-xs text-red-500 mt-1">{fieldErrors.duracao}</p>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Categoria (opcional)</label>
              <input
                type="text"
                list="categorias"
                placeholder="Corte, Barba, Coloração..."
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
              />
              <datalist id="categorias">
                {categorias.map((c) => (
                  <option key={String(c)} value={String(c)} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descrição (opcional)</label>
              <textarea
                placeholder="Descreva o serviço..."
                rows={2}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none"
              />
            </div>
            <div className="flex gap-3">
              <Button type="button" variant="outline" className="flex-1" onClick={() => { setModalOpen(false); setEditingId(null); resetForm(); }}>
                Cancelar
              </Button>
              <Button type="button" className="flex-1" disabled={submitting} onClick={handleSubmit}>
                {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover serviço?</AlertDialogTitle>
            <AlertDialogDescription>
              O serviço será desativado e não aparecerá em novos agendamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
