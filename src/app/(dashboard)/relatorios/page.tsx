import type { Metadata } from "next";
import { RelatoriosView } from "@/components/relatorios/RelatoriosView";

export const metadata: Metadata = { title: "Relatórios" };

export default function RelatoriosPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-500 text-sm">Análise detalhada do desempenho do negócio</p>
      </div>
      <RelatoriosView />
    </div>
  );
}
