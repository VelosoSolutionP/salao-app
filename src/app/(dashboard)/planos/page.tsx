import type { Metadata } from "next";
import { PlanosView } from "@/components/planos/PlanosView";

export const metadata: Metadata = { title: "Planos de Fidelidade" };

export default function PlanosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Planos de Fidelidade</h1>
        <p className="text-gray-500 text-sm">Crie planos mensais configuráveis e vincule clientes</p>
      </div>
      <PlanosView />
    </div>
  );
}
