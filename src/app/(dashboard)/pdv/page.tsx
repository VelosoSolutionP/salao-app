import type { Metadata } from "next";
import { PDVView } from "@/components/pdv/PDVView";

export const metadata: Metadata = { title: "PDV — Ponto de Venda" };

export default function PDVPage() {
  return (
    <div className="space-y-4 h-full">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ponto de Venda</h1>
        <p className="text-gray-500 text-sm">Selecione produtos ou serviços e gere um PIX na hora</p>
      </div>
      <PDVView />
    </div>
  );
}
