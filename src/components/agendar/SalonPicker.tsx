"use client";

import { useState } from "react";
import { AgendarView } from "./AgendarView";
import { MapPin, Scissors, Users, ChevronRight, ChevronLeft } from "lucide-react";

type Salon = Record<string, unknown>;

interface Props {
  salons: Salon[];
  totalMultaPendente: number;
}

export function SalonPicker({ salons, totalMultaPendente }: Props) {
  const [selected, setSelected] = useState<Salon | null>(
    // Auto-select if only one salon has services
    salons.length === 1 ? salons[0] : null
  );

  if (selected) {
    return (
      <div>
        {/* Salon indicator + back button */}
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => setSelected(null)}
            className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25 transition-colors flex-shrink-0"
          >
            <ChevronLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/15 flex-1 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
              <Scissors className="w-3 h-3 text-white" />
            </div>
            <span className="text-white font-black text-sm truncate">{selected.name as string}</span>
          </div>
        </div>

        {totalMultaPendente > 0 && (
          <div className="mb-4 flex items-start gap-3 px-4 py-3 bg-red-500/20 border border-red-400/30 rounded-2xl backdrop-blur-sm">
            <span className="text-red-200 text-lg flex-shrink-0">⚠️</span>
            <div>
              <p className="text-white font-bold text-sm">Taxa de não comparecimento pendente</p>
              <p className="text-red-200 text-xs mt-0.5">
                R$ {totalMultaPendente.toFixed(2)} serão adicionados ao seu próximo agendamento.
              </p>
            </div>
          </div>
        )}

        <AgendarView salons={[selected]} salonId={selected.id as string} />
      </div>
    );
  }

  // Salon selection screen
  const withServices = salons.filter(
    (s) => ((s.servicos as unknown[]) ?? []).length > 0
  );
  const displaySalons = withServices.length > 0 ? withServices : salons;

  return (
    <div>
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-white/10 backdrop-blur-sm rounded-3xl mb-3 ring-1 ring-white/20 shadow-xl">
          <MapPin className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-black text-white tracking-tight">Escolha o salão</h1>
        <p className="text-violet-200 mt-1 text-sm">Onde você quer ser atendido?</p>
      </div>

      <div className="space-y-3">
        {displaySalons.map((s) => {
          const servicosCount = ((s.servicos as unknown[]) ?? []).length;
          const colabsCount   = ((s.colaboradores as unknown[]) ?? []).length;
          return (
            <button
              key={s.id as string}
              onClick={() => setSelected(s)}
              className="w-full flex items-center gap-4 p-4 rounded-3xl text-left transition-all active:scale-[0.98] hover:scale-[1.01]"
              style={{
                background: "rgba(255,255,255,0.10)",
                border: "1px solid rgba(255,255,255,0.15)",
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center flex-shrink-0 shadow-lg">
                <span className="text-2xl">✂️</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-white text-base leading-tight truncate">
                  {s.name as string}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-violet-200 text-xs font-semibold">
                    <Scissors className="w-3 h-3" />
                    {servicosCount} serviço{servicosCount !== 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1 text-violet-200 text-xs font-semibold">
                    <Users className="w-3 h-3" />
                    {colabsCount} profissional{colabsCount !== 1 ? "is" : ""}
                  </span>
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-white/40 flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
