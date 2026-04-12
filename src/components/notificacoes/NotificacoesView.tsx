"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, MessageCircle, Bell, Clock, Loader2 } from "lucide-react";

interface NotifConfig {
  emailAtivo: boolean;
  whatsappAtivo: boolean;
  pushAtivo: boolean;
  lembrete1h: boolean;
  lembrete24h: boolean;
  lembreteConfirm: boolean;
}

export function NotificacoesView() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["notif-config"],
    queryFn: () => fetch("/api/notificacoes/configuracoes").then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<NotifConfig>) =>
      fetch("/api/notificacoes/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notif-config"] });
      toast.success("Configurações salvas!");
    },
    onError: () => toast.error("Erro ao salvar"),
  });

  function toggle(key: keyof NotifConfig) {
    if (!config) return;
    updateMutation.mutate({ [key]: !config[key] });
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Canais de Notificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Email</Label>
                <p className="text-xs text-gray-400">Notificações por email</p>
              </div>
            </div>
            <Switch
              checked={config?.emailAtivo ?? true}
              onCheckedChange={() => toggle("emailAtivo")}
              disabled={updateMutation.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-green-500" />
              <div>
                <Label className="text-sm font-medium">WhatsApp</Label>
                <p className="text-xs text-gray-400">Link para envio pelo WhatsApp</p>
              </div>
            </div>
            <Switch
              checked={config?.whatsappAtivo ?? true}
              onCheckedChange={() => toggle("whatsappAtivo")}
              disabled={updateMutation.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-violet-500" />
              <div>
                <Label className="text-sm font-medium">Push (navegador)</Label>
                <p className="text-xs text-gray-400">Notificações push no dispositivo</p>
              </div>
            </div>
            <Switch
              checked={config?.pushAtivo ?? false}
              onCheckedChange={() => toggle("pushAtivo")}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lembretes Automáticos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <Label className="text-sm font-medium">Lembrete 24h antes</Label>
                <p className="text-xs text-gray-400">Aviso um dia antes do agendamento</p>
              </div>
            </div>
            <Switch
              checked={config?.lembrete24h ?? true}
              onCheckedChange={() => toggle("lembrete24h")}
              disabled={updateMutation.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-orange-500" />
              <div>
                <Label className="text-sm font-medium">Lembrete 1h antes</Label>
                <p className="text-xs text-gray-400">Aviso uma hora antes do agendamento</p>
              </div>
            </div>
            <Switch
              checked={config?.lembrete1h ?? true}
              onCheckedChange={() => toggle("lembrete1h")}
              disabled={updateMutation.isPending}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-blue-500" />
              <div>
                <Label className="text-sm font-medium">Confirmação de agendamento</Label>
                <p className="text-xs text-gray-400">Notificação ao confirmar um agendamento</p>
              </div>
            </div>
            <Switch
              checked={config?.lembreteConfirm ?? true}
              onCheckedChange={() => toggle("lembreteConfirm")}
              disabled={updateMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-100 bg-amber-50">
        <CardContent className="p-4">
          <p className="text-sm text-amber-700 font-medium">Aviso sobre WhatsApp</p>
          <p className="text-xs text-amber-600 mt-1">
            O envio de mensagens WhatsApp funciona via link direto (wa.me).
            Ao clicar, você será redirecionado para iniciar a conversa com o cliente no WhatsApp.
            Não há integração com API oficial do WhatsApp Business nesta versão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
