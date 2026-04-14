import type { Metadata } from "next";
import { RedeView } from "@/components/rede/RedeView";

export const metadata: Metadata = { title: "Gestão de Rede" };

export default function RedePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestão de Rede</h1>
        <p className="text-gray-500 text-sm">Gerencie múltiplas unidades e acompanhe métricas consolidadas</p>
      </div>
      <RedeView />
    </div>
  );
}
