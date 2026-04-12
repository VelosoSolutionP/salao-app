import { formatBRL } from "@/lib/utils";
import { CalendarDays, DollarSign, Users, Clock, TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  agendamentosHoje: number;
  receitaMes: number;
  clientesTotal: number;
  pendentes: number;
  estoqueBaixo?: number;
}

export function DashboardCards({ agendamentosHoje, receitaMes, clientesTotal, pendentes, estoqueBaixo = 0 }: Props) {
  const cards = [
    {
      label: "Agendamentos hoje",
      value: String(agendamentosHoje),
      sub: agendamentosHoje === 0 ? "Nenhum agendado" : `${agendamentosHoje} atendimento${agendamentosHoje > 1 ? "s" : ""}`,
      icon: CalendarDays,
      accent: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
      ring: "ring-blue-100",
    },
    {
      label: "Receita do mês",
      value: formatBRL(receitaMes),
      sub: receitaMes > 0 ? <span className="flex items-center gap-1 text-emerald-600"><TrendingUp className="w-3 h-3" /> Este mês</span> : "Sem receita ainda",
      icon: DollarSign,
      accent: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      ring: "ring-emerald-100",
    },
    {
      label: "Total de clientes",
      value: String(clientesTotal),
      sub: "Cadastrados",
      icon: Users,
      accent: "bg-violet-500",
      bg: "bg-violet-50",
      text: "text-violet-600",
      ring: "ring-violet-100",
    },
    {
      label: "Aguardando confirmação",
      value: String(pendentes),
      sub: pendentes > 0 ? <span className="flex items-center gap-1 text-amber-600"><TrendingDown className="w-3 h-3" /> Precisa atenção</span> : "Tudo confirmado",
      icon: Clock,
      accent: pendentes > 0 ? "bg-amber-500" : "bg-gray-400",
      bg: pendentes > 0 ? "bg-amber-50" : "bg-gray-50",
      text: pendentes > 0 ? "text-amber-600" : "text-gray-500",
      ring: pendentes > 0 ? "ring-amber-100" : "ring-gray-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className={`bg-white rounded-2xl p-5 ring-1 ${card.ring} shadow-sm hover:shadow-md transition-shadow`}
        >
          <div className="flex items-start justify-between mb-4">
            <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-5 h-5 ${card.text}`} />
            </div>
            <div className={`w-2 h-2 rounded-full ${card.accent} mt-1`} />
          </div>
          <p className="text-2xl font-black text-gray-900 tracking-tight">{card.value}</p>
          <p className="text-xs font-semibold text-gray-500 mt-0.5">{card.label}</p>
          <div className="text-[11px] text-gray-400 mt-1.5">{card.sub}</div>
        </div>
      ))}
    </div>
  );
}
