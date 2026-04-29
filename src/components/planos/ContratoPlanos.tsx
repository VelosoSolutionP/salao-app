"use client";

import { useState } from "react";
import { PlanosSistemaView } from "./PlanosSistemaView";
import { PagamentoPlanoModal } from "./PagamentoPlanoModal";
import { PLANOS, PlanoTipo } from "@/lib/planos";

export function ContratoPlanos({ planoAtual }: { planoAtual?: string | null }) {
  const [modalPlano, setModalPlano] = useState<{ tipo: PlanoTipo; preco: number } | null>(null);

  function handlePagar(tipo: string, preco: number) {
    setModalPlano({ tipo: tipo as PlanoTipo, preco });
  }

  const config = modalPlano ? PLANOS[modalPlano.tipo] : null;

  return (
    <>
      <PlanosSistemaView planoAtual={planoAtual} onPagar={handlePagar} />
      {modalPlano && config && (
        <PagamentoPlanoModal
          open={!!modalPlano}
          onClose={() => setModalPlano(null)}
          planoTipo={modalPlano.tipo}
          planoNome={config.nome}
          preco={modalPlano.preco}
        />
      )}
    </>
  );
}
