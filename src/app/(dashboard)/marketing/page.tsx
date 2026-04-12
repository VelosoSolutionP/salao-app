import type { Metadata } from "next";
import { MarketingView } from "@/components/marketing/MarketingView";

export const metadata: Metadata = { title: "Marketing" };

export default function MarketingPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing</h1>
        <p className="text-gray-500 text-sm">Campanhas, promoções e cupons de desconto</p>
      </div>
      <MarketingView />
    </div>
  );
}
