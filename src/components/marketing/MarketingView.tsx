"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Megaphone, Tag, Loader2, Copy, MessageCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";

const TIPO_LABELS: Record<string, string> = {
  DESCONTO: "Desconto",
  FIDELIDADE: "Fidelidade",
  PRIMEIRO_AGENDAMENTO: "Primeiro Agendamento",
  ANIVERSARIO: "Aniversário",
  PACOTE: "Pacote",
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
      if (data.error) { toast.error(data.error); return; }
      toast.success("Campanha criada!");
      queryClient.invalidateQueries({ queryKey: ["campanhas"] });
      setModalOpen(false);
      form.reset();
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

  function shareWhatsApp(campanha: any) {
    const msg = encodeURIComponent(
      `🎉 Promoção especial!\n\n*${campanha.nome}*\n${campanha.descricao ?? ""}\n\n${campanha.codigo ? `Use o código: *${campanha.codigo}*` : ""}\n\nAgende agora!`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank");
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{(campanhas ?? []).length} campanha(s)</p>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova campanha
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
      ) : (campanhas ?? []).length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-16">
            <Megaphone className="w-12 h-12 text-gray-200 mb-3" />
            <p className="text-gray-500">Nenhuma campanha criada</p>
            <p className="text-gray-400 text-sm">Crie promoções para atrair mais clientes</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(campanhas ?? []).map((c: any) => (
            <Card key={c.id} className={`${!c.ativa ? "opacity-60" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">{c.nome}</p>
                      <Badge variant="secondary" className="text-xs">{TIPO_LABELS[c.tipo]}</Badge>
                    </div>
                    {c.descricao && (
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.descricao}</p>
                    )}
                  </div>
                  <Switch
                    checked={c.ativa}
                    onCheckedChange={(checked) => toggleMutation.mutate({ id: c.id, ativa: checked })}
                  />
                </div>

                <div className="space-y-1.5 text-sm">
                  {c.desconto && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-3.5 h-3.5 text-violet-500" />
                      <span className="text-gray-600">
                        {c.desconto}{c.tipoDesconto === "PERCENTUAL" ? "% de desconto" : " reais de desconto"}
                      </span>
                    </div>
                  )}
                  {c.codigo && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">Código:</span>
                      <code className="bg-gray-100 px-2 py-0.5 rounded text-xs font-mono font-bold text-violet-700">
                        {c.codigo}
                      </code>
                      <button
                        onClick={() => { navigator.clipboard.writeText(c.codigo); toast.success("Código copiado!"); }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                  {c.validaAte && (
                    <p className="text-xs text-gray-400">
                      Válido até {formatDate(c.validaAte)}
                    </p>
                  )}
                  {c.usosMax && (
                    <p className="text-xs text-gray-400">
                      {c.usosAtuais}/{c.usosMax} usos
                    </p>
                  )}
                </div>

                <div className="flex gap-2 mt-3 pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1.5 text-green-600 border-green-200 hover:bg-green-50"
                    onClick={() => shareWhatsApp(c)}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    Compartilhar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Campanha</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => createMutation.mutate(d))} className="space-y-4">
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                      <Input type="number" min="0" placeholder="10" {...field} onChange={(e) => field.onChange(parseFloat(e.target.value))} />
                    </FormControl>
                  </FormItem>
                )} />
                <FormField control={form.control} name="tipoDesconto" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormControl><Input placeholder="PROMO10" className="uppercase" {...field} onChange={(e) => field.onChange(e.target.value.toUpperCase())} /></FormControl>
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
                <Button type="button" variant="outline" className="flex-1" onClick={() => setModalOpen(false)}>Cancelar</Button>
                <Button type="submit" className="flex-1" disabled={createMutation.isPending}>
                  {createMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar campanha
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}
