import type { Metadata } from "next";
import { RegistroForm } from "@/components/auth/RegistroForm";

export const metadata: Metadata = { title: "Criar Conta" };

export default function RegistroPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="flex items-center justify-center w-16 h-16 bg-violet-600 rounded-2xl mx-auto mb-4">
          <span className="text-3xl">✂️</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Criar conta</h1>
        <p className="text-gray-500 mt-1">Comece a gerenciar seu salão</p>
      </div>
      <RegistroForm />
    </div>
  );
}
