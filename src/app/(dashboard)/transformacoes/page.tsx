import type { Metadata } from "next";
import { TransformacoesPage } from "@/components/transformacoes/TransformacoesPage";

export const metadata: Metadata = { title: "Transformações" };

export default function Page() {
  return <TransformacoesPage />;
}
