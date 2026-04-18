"use client";

import {
  LayoutDashboard, CalendarDays, Users, Scissors, UserCheck,
  Package, DollarSign, BarChart3, Megaphone, Sparkles, Star, Building2,
  Check, X as XIcon, Zap, Crown, Gem,
} from "lucide-react";

const MODULES = [
  { icon: LayoutDashboard, label: "Dashboard",         plans: ["BASICO", "PRATA", "OURO"] },
  { icon: CalendarDays,    label: "Agenda",             plans: ["BASICO", "PRATA", "OURO"] },
  { icon: Users,           label: "Clientes",           plans: ["BASICO", "PRATA", "OURO"] },
  { icon: Scissors,        label: "Serviços",           plans: ["BASICO", "PRATA", "OURO"] },
  { icon: UserCheck,       label: "Equipe",             plans: ["BASICO", "PRATA", "OURO"] },
  { icon: Package,         label: "Estoque",            plans: ["PRATA", "OURO"] },
  { icon: DollarSign,      label: "Financeiro",         plans: ["PRATA", "OURO"] },
  { icon: BarChart3,       label: "Relatórios",         plans: ["OURO"] },
  { icon: Megaphone,       label: "Marketing",          plans: ["OURO"] },
  { icon: Sparkles,        label: "Transformações",     plans: ["OURO"] },
  { icon: Star,            label: "Planos Fidelidade",  plans: ["OURO"] },
  { icon: Building2,       label: "Multi-Unidades",     plans: ["OURO"] },
];

const PLANS = [
  {
    tipo: "BASICO",
    nome: "Básico",
    preco: 60,
    cor: "#6366f1",
    gradient: "from-indigo-500 via-violet-500 to-purple-600",
    glowColor: "shadow-indigo-100",
    borderColor: "border-indigo-200",
    icon: Zap,
    maxFunc: 1,
    maxUnidades: 1,
    desc: "Para começar seu negócio",
  },
  {
    tipo: "PRATA",
    nome: "Prata",
    preco: 90,
    cor: "#64748b",
    gradient: "from-slate-600 via-slate-500 to-slate-700",
    glowColor: "shadow-slate-100",
    borderColor: "border-slate-300",
    icon: Crown,
    maxFunc: 5,
    maxUnidades: 2,
    desc: "Para salões em crescimento",
    destaque: true,
  },
  {
    tipo: "OURO",
    nome: "Ouro",
    preco: 250,
    cor: "#d97706",
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    glowColor: "shadow-amber-100",
    borderColor: "border-amber-300",
    icon: Gem,
    maxFunc: 10,
    maxUnidades: 5,
    desc: "Todos os recursos premium",
  },
];

export function PlanosSistemaView({ planoAtual }: { planoAtual?: string | null }) {
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900">Planos & Módulos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Compare os planos e veja os módulos incluídos em cada tier
          </p>
        </div>
        {planoAtual && (
          <div
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold"
            style={{
              background: `${PLANS.find((p) => p.tipo === planoAtual)?.cor}18`,
              color: PLANS.find((p) => p.tipo === planoAtual)?.cor,
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            Plano atual: {PLANS.find((p) => p.tipo === planoAtual)?.nome}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {PLANS.map((plan) => {
          const isAtual = planoAtual === plan.tipo;
          const Icon = plan.icon;

          return (
            <div
              key={plan.tipo}
              className={`rounded-2xl overflow-hidden border-2 transition-all duration-200 ${
                isAtual
                  ? `${plan.borderColor} shadow-xl ${plan.glowColor}`
                  : "border-gray-100 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Header gradient */}
              <div
                className={`bg-gradient-to-br ${plan.gradient} px-5 pt-5 pb-6 text-white relative overflow-hidden`}
              >
                {/* Decorative circles */}
                <div className="absolute -top-8 -right-8 w-28 h-28 bg-white/10 rounded-full" />
                <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-black/10 rounded-full" />

                <div className="relative">
                  {/* Top row: icon + badges */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center ring-1 ring-white/30">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      {isAtual && (
                        <span
                          className="text-[10px] font-black px-2.5 py-1 rounded-full bg-white"
                          style={{ color: plan.cor }}
                        >
                          Seu plano
                        </span>
                      )}
                      {plan.destaque && !isAtual && (
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-white/20 ring-1 ring-white/30 text-white">
                          Recomendado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Name + desc */}
                  <p className="font-black text-2xl leading-none tracking-tight">{plan.nome}</p>
                  <p className="text-white/65 text-xs mt-1">{plan.desc}</p>

                  {/* Price */}
                  <div className="flex items-end gap-1 mt-4">
                    <span className="text-white/70 text-sm font-semibold self-start mt-1">R$</span>
                    <span className="text-4xl font-black leading-none">{plan.preco}</span>
                    <span className="text-white/70 text-sm mb-0.5">/mês</span>
                  </div>
                </div>
              </div>

              {/* Stats bar */}
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3 flex items-center gap-0 divide-x divide-gray-200">
                <div className="flex-1 text-center pr-3">
                  <p className="text-xl font-black text-gray-900">{plan.maxFunc}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                    {plan.maxFunc === 1 ? "Profissional" : "Profissionais"}
                  </p>
                </div>
                <div className="flex-1 text-center pl-3">
                  <p className="text-xl font-black text-gray-900">{plan.maxUnidades}</p>
                  <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                    {plan.maxUnidades === 1 ? "Unidade" : "Unidades"}
                  </p>
                </div>
              </div>

              {/* Module list */}
              <div className="bg-white p-4 space-y-1.5">
                {MODULES.map((mod) => {
                  const has = mod.plans.includes(plan.tipo);
                  const ModIcon = mod.icon;
                  return (
                    <div
                      key={mod.label}
                      className={`flex items-center gap-2.5 py-1 rounded-lg px-1 transition-colors ${
                        has ? "" : "opacity-30"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 ${
                          has ? "bg-emerald-100" : "bg-gray-100"
                        }`}
                      >
                        {has ? (
                          <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                        ) : (
                          <XIcon className="w-3 h-3 text-gray-400" strokeWidth={2.5} />
                        )}
                      </div>
                      <ModIcon
                        className={`w-3.5 h-3.5 flex-shrink-0 ${has ? "text-gray-500" : "text-gray-300"}`}
                      />
                      <span
                        className={`text-sm leading-none ${
                          has ? "font-medium text-gray-800" : "text-gray-400"
                        }`}
                      >
                        {mod.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
