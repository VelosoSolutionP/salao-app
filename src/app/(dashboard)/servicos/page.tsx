import type { Metadata } from "next";
import { ServicosList } from "@/components/servicos/ServicosList";

export const metadata: Metadata = { title: "Serviços" };

export default function ServicosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
        <p className="text-gray-500 text-sm">Gerencie os serviços oferecidos pelo salão</p>
      </div>
      <ServicosList />
    </div>
  );
}
