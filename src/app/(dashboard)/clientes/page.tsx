import type { Metadata } from "next";
import { ClientesView } from "@/components/clientes/ClientesView";

export const metadata: Metadata = { title: "Clientes" };

export default function ClientesPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
        <p className="text-gray-500 text-sm">Histórico e perfil de todos os clientes</p>
      </div>
      <ClientesView />
    </div>
  );
}
