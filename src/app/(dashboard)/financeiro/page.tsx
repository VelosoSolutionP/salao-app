import type { Metadata } from "next";
import { FinanceiroView } from "@/components/financeiro/FinanceiroView";

export const metadata: Metadata = { title: "Financeiro" };

export default function FinanceiroPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 text-sm">Controle de receitas, despesas e fluxo de caixa</p>
      </div>
      <FinanceiroView />
    </div>
  );
}
