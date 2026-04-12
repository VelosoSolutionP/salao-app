import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatTime, getInitials } from "@/lib/utils";
import { CalendarDays } from "lucide-react";

const STATUS_STYLE: Record<string, { dot: string; label: string; text: string }> = {
  PENDENTE:       { dot: "bg-amber-400",  label: "Pendente",      text: "text-amber-600" },
  CONFIRMADO:     { dot: "bg-blue-400",   label: "Confirmado",    text: "text-blue-600" },
  EM_ANDAMENTO:   { dot: "bg-violet-500 animate-pulse", label: "Em andamento", text: "text-violet-600" },
  CONCLUIDO:      { dot: "bg-emerald-400", label: "Concluído",    text: "text-emerald-600" },
  CANCELADO:      { dot: "bg-red-400",    label: "Cancelado",     text: "text-red-500" },
  NAO_COMPARECEU: { dot: "bg-gray-300",   label: "Não compareceu", text: "text-gray-400" },
};

interface Agendamento {
  id: string;
  inicio: Date;
  status: string;
  cliente: { user: { name: string; phone: string | null } };
  colaborador: { user: { name: string; image: string | null } };
  servicos: Array<{ servico: { nome: string } }>;
}

export function AgendamentosHoje({ agendamentos }: { agendamentos: Agendamento[] }) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-gray-100 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
        <h3 className="font-bold text-gray-900 text-sm">Próximos agendamentos</h3>
        <span className="text-xs bg-violet-50 text-violet-600 font-semibold px-2.5 py-1 rounded-full">
          {agendamentos.length}
        </span>
      </div>

      {agendamentos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-10 text-center px-6">
          <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center mb-3">
            <CalendarDays className="w-6 h-6 text-gray-300" />
          </div>
          <p className="text-sm font-semibold text-gray-500">Nenhum agendamento</p>
          <p className="text-xs text-gray-400 mt-1">Sua agenda está livre hoje</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
          {agendamentos.map((a) => {
            const s = STATUS_STYLE[a.status] ?? STATUS_STYLE.PENDENTE;
            return (
              <div key={a.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-gray-50/60 transition-colors">
                {/* Time */}
                <div className="min-w-[44px] text-center pt-0.5">
                  <p className="text-sm font-black text-violet-600 tabular-nums">{formatTime(a.inicio)}</p>
                </div>

                {/* Left accent line */}
                <div className={`w-0.5 self-stretch rounded-full ${s.dot.replace("animate-pulse", "")} opacity-60 flex-shrink-0`} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.cliente.user.name}</p>
                  <p className="text-xs text-gray-400 truncate mt-0.5">
                    {a.servicos.map((sv) => sv.servico.nome).join(" + ")}
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <Avatar className="w-4 h-4">
                      <AvatarImage src={a.colaborador.user.image ?? ""} />
                      <AvatarFallback className="text-[8px] bg-zinc-800 text-white">
                        {getInitials(a.colaborador.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-[11px] text-gray-400">{a.colaborador.user.name}</span>
                    <span className={`ml-auto text-[10px] font-semibold ${s.text} flex items-center gap-1`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
