import type { Metadata } from "next";
import { AgendaTabs } from "@/components/agenda/AgendaTabs";

export const metadata: Metadata = { title: "Agenda" };

export default function AgendaPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
        <p className="text-gray-500 text-sm">Gerencie todos os agendamentos em tempo real</p>
      </div>
      <AgendaTabs />
    </div>
  );
}
