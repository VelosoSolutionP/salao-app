import type { Metadata } from "next";
import { EquipeView } from "@/components/equipe/EquipeView";

export const metadata: Metadata = { title: "Equipe" };

export default function EquipePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Equipe</h1>
        <p className="text-gray-500 text-sm">Gerencie os profissionais e horários de trabalho</p>
      </div>
      <EquipeView />
    </div>
  );
}
