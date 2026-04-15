import type { Metadata } from "next";
import { EstoqueView } from "@/components/estoque/EstoqueView";

export const metadata: Metadata = { title: "Estoque — Hera" };

export default function EstoquePage() {
  return (
    <div className="space-y-2 max-w-6xl">
      <div className="mb-5">
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Controle de Estoque</h1>
        <p className="text-gray-400 text-sm mt-1">Gerencie produtos, insumos e alertas de reposição.</p>
      </div>
      <EstoqueView />
    </div>
  );
}
