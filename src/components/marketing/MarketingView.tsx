"use client";
import { errMsg } from "@/lib/api-error";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus, Megaphone, Tag, Loader2, Copy, MessageCircle,
  Pencil, Trash2, Percent, DollarSign, CalendarRange, Ticket,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

const TIPO_LABELS: Record<string, string> = {
  DESCONTO: "Desconto",
  FIDELIDADE: "Fidelidade",
  PRIMEIRO_AGENDAMENTO: "1° Agendamento",
  ANIVERSARIO: "Aniversário",
  PACOTE: "Pacote",
};

const TIPO_COLORS: Record<string, string> = {
  DESCONTO: "bg-orange-100 text-orange-700",
  FIDELIDADE: "bg-violet-100 text-violet-700",
  PRIMEIRO_AGENDAMENTO: "bg-emerald-100 text-emerald-700",
  ANIVERSARIO: "bg-pink-100 text-pink-700",
  PACOTE: "bg-blue-100 text-blue-700",
};

const TIPO_GRADIENT: Record<string, string> = {
  DESCONTO: "from-orange-500 to-amber-500",
  FIDELIDADE: "from-violet-500 to-purple-600",
  PRIMEIRO_AGENDAMENTO: "from-emerald-500 to-teal-600",
  ANIVERSARIO: "from-pink-500 to-rose-500",
  PACOTE: "from-blue-500 to-indigo-600",
};

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().optional(),
  tipo: z.enum(["DESCONTO", "FIDELIDADE", "PRIMEIRO_AGENDAMENTO", "ANIVERSARIO", "PACOTE"]),
  desconto: z.number().positive().optional(),
  tipoDesconto: z.enum(["PERCENTUAL", "FIXO"]).optional(),
  codigo: z.string().optional(),
  validaDe: z.string().optional(),
  validaAte: z.string().optional(),
  usosMax: z.number().int().positive().optional(),
});

type FormData = z.infer<typeof schema>;

export function MarketingView() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { nome: "", tipo: "DESCONTO", tipoDesconto: "PERCENTUAL" },
  });

  const { data: campanhas, isLoading } = useQuery({
    queryKey: ["campanhas"],
    queryFn: () => fetch("/api/marketing/campanhas").then((r) => r.json()),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) =>
      fetch("/api/marketing/campanhas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          validaDe: data.validaDe ? new Date(data.validaDe).toISOString() : undefined,
          validaAte: data.validaAte ? new Date(data.validaAte).toISOString() : undefined,
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(errMsg(data.error)); return; }
      toast.success("Campanha criada!");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
      closeModal();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: FormData }) =>
      fetch(`/api/marketing/campanhas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          validaDe: data.validaDe ? new Date(data.validaDe).toISOString() : undefined,
          validaAte: data.validaAte ? new Date(data.validaAte).toISOString() : undefined,
        }),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      if (data.error) { toast.error(errMsg(data.error)); return; }
      toast.success("Campanha atualizada!");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
      closeModal();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, ativa }: { id: string; ativa: boolean }) =>
      fetch(`/api/marketing/campanhas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativa }),
      }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["campanhas"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/marketing/campanhas/${id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: () => {
      toast.success("Campanha removida");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
      setDeletingId(null);
    },
  });

  function openCreate() {
    setEditingId(null);
    form.reset({ nome: "", tipo: "DESCONTO", tipoDesconto: "PERCENTUAL" });
    setModalOpen(true);
  }

  function openEdit(c: any) {
    setEditingId(c.id);
    form.reset({
      nome: c.nome,
      descricao: c.descricao ?? "",
      tipo: c.tipo,
      desconto: c.desconto ?? undefined,
      tipoDesconto: c.tipoDesconto ?? "PERCENTUAL",
      codigo: c.codigo ?? "",
      usosMax: c.usosMax ?? undefined,
    });
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    form.reset();
  }

  function onSubmit(data: FormData) {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function shareWhatsApp(campanha: any) {
    const msg = encodeURIComponent(
      `🎉 Promoção especial!\n\n*${campanha.nome}*\n${campanha.descricao ?? ""}\n\n${campanha.codigo ? `Use o código: *${campanha.codigo}*` : ""}\n\nAgende agora!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <p className="text-sm text-gray-500">
          <span className="font-bold text-gray-800">{(campanhas ?? []).length}</span> campanha(s)
        </p>
        <Button
          onClick={openCreate}
          className="gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 shadow-md shadow-violet-200"
        >
          <Plus className="w-4 h-4" /> Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
        </div>
      ) : (campanhas ?? []).length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="w-16 h-16 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-violet-300" />
          </div>
          <p className="font-semibold text-gray-700">Nenhuma campanha criada</p>
          <p className="text-sm text-gray-400 mt-1">Crie promoções para atrair e fidelizar clientes</p>
          <Button onClick={openCreate} className="mt-5 gap-2">
            <Plus className="w-4 h-4" /> Criar campanha
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {(campanhas ?? []).map((c: any) => {
            const gradient = TIPO_GRADIENT[c.tipo] ?? "from-gray-400 to-gray-500";
            return (
              <div
                key={c.id}
                className={`rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden transition-all hover:shadow-md ${!c.ativa ? "opacity-55" : ""}`}
              >
                {/* Header */}
                <div className={`bg-gradient-to-r ${gradient} px-5 py-4 text-white relative overflow-hidden`}>
                  <div className="absolute -top-3 -right-3 w-16 h-16 bg-white/10 rounded-full" />
                  <div className="flex items-start justify-between relative">
                    <div className="flex-1">
                      <p className="font-black text-base leading-tight">{c.nome}</p>
                      {c.descricao && (
                        <p className="text-white/75 text-xs mt-0.5 line-clamp-1">{c.descricao}</p>
                      )}
                    </div>
                    <Switch
                      checked={c.ativa}
                      onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, ativa: checked })}
                      className="data-[state=checked]:bg-white/30 data-[state=unchecked]:bg-black/20 flex-shrink-0"
                    />
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {TIPO_LABELS[c.tipo]}
                    </span>
                    {c.desconto && (
                      <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        {c.tipoDesconto === "PERCENTUAL"
                          ? <><Percent className="w-2.5 h-2.5" /> {c.desconto}% off</>
                          : <><DollarSign className="w-2.5 h-2.5" /> R${c.desconto} off</>
                        }
                      </span>
                    )}
                  </div>
                </div>

                {/* Body */}
                <div className="p-4 space-y-2.5">
                  {c.codigo && (
                    <div className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl">
                      <Ticket className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                      <code className="flex-1 text-xs font-mono font-bold text-violet-700 truncate">{c.codigo}</code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.codigo); toast.success("Código copiado!"); }}
                        className="text-gray-400 hover:text-violet-600 transition-colors flex-shrink-0"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {c.validaAte && (
                      <span className="flex items-center gap-1">
                        <CalendarRange className="w-3 h-3" /> até {formatDate(c.validaAte)}
                      </span>
                    )}
                    {c.usosMax && (
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" /> {c.usosAtuais}/{c.usosMax} usos
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 text-green-700 border-green-200 hover:bg-green-50 text-xs"
                      onClick={() => shareWhatsApp(c)}
                    >
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                    <button
                      type="button"
                      onClick={() => openEdit(c)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5 text-gray-400" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeletingId(c.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal criar / editar */}
      <Dialog open={modalOpen} onOpenChange={(o) => { if (!o) closeModal(); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Editar Campanha" : "Nova Campanha"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField control={form.control} name="nome" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome da campanha</FormLabel>
                  <FormControl><Input placeholder="Black Friday, Aniversário, etc." {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="tipo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(TIPO_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="desconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Desconto</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="10"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipoDesconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="PERCENTUAL">% (Percentual)</SelectItem>
                        <SelectItem value="FIXO">R$ (Fixo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="codigo" render={({ field }) => (
                <FormItem>
                  <FormLabel>Código promocional (opcional)</FormLabel>
                  <FormControl>
                    <Input placeholder="PROMO10" className="uppercase"
                      {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} />
                  </FormControl>
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="validaDe" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Início</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="validaAte" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fim</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="descricao" render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição (opcional)</FormLabel>
                  <FormControl><Textarea placeholder="Detalhes da promoção..." rows={3} {...field} /></FormControl>
                </FormItem>
              )} />

              <div className="flex gap-3">
                <Button type="button" variant="outline" className="flex-1" onClick={closeModal}>Cancelar</Button>
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                  disabled={isPending}
                >
                  {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingId ? "Salvar" : "Criar campanha"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Confirmar exclusão */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => { if (!o) setDeletingId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>
              A campanha será desativada permanentemente. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deletingId && deleteMutation.mutate(deletingId)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
