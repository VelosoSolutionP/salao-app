import type { Metadata } from "next";
import { NotificacoesView } from "@/components/notificacoes/NotificacoesView";

export const metadata: Metadata = { title: "Notificações" };

export default function NotificacoesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notificações</h1>
        <p className="text-gray-500 text-sm">Configure como e quando receber alertas</p>
      </div>
      <NotificacoesView />
    </div>
  );
}
