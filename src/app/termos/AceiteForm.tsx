"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export function AceiteForm() {
  const router = useRouter();
  const [leu, setLeu] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  async function handleAceitar() {
    if (!leu) return;
    setLoading(true);
    setErro("");
    try {
      const res = await fetch("/api/termos/aceitar", { method: "POST" });
      if (!res.ok) throw new Error("Erro ao registrar aceite");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setErro("Ocorreu um erro. Tente novamente.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5 pt-2">
      <div className="flex items-start gap-3">
        <Checkbox
          id="aceite"
          checked={leu}
          onCheckedChange={(v) => setLeu(Boolean(v))}
          className="mt-0.5"
        />
        <Label htmlFor="aceite" className="text-sm text-gray-700 cursor-pointer leading-relaxed">
          Li, compreendi e aceito integralmente os Termos de Uso e a Política de Cobrança Mensal
          descritos acima.
        </Label>
      </div>

      {erro && <p className="text-sm text-red-600">{erro}</p>}

      <Button
        onClick={handleAceitar}
        disabled={!leu || loading}
        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-semibold py-2.5"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Registrando aceite...
          </>
        ) : (
          "Aceitar e começar a usar"
        )}
      </Button>
    </div>
  );
}
