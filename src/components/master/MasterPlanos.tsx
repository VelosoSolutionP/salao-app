"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Zap, Crown, Gem, DollarSign, Store, ArrowRight, Loader2, TrendingUp,
} from "lucide-react";

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const TIERS = [
  {
    tipo: "BASICO",
    nome: "Básico",
    gradient: "from-indigo-500 via-violet-500 to-purple-600",
    cor: "#6366f1",
    glow: "shadow-indigo-100",
    border: "border-indigo-200",
    icon: Zap,
  },
  {
    tipo: "PRATA",
    nome: "Prata",
    gradient: "from-slate-500 to-slate-700",
    cor: "#64748b",
    glow: "shadow-slate-100",
    border: "border-slate-200",
    icon: Crown,
  },
  {
    tipo: "OURO",
    nome: "Ouro",
    gradient: "from-yellow-500 via-amber-500 to-orange-500",
    cor: "#d97706",
    glow: "shadow-amber-100",
    border: "border-amber-200",
    icon: Gem,
  },
];

interface Contrato {
  id: string;
  plano: string;
  valorMensal: number;
  diaVencimento: number;
  createdAt: string;
  salon: { id: string; name: string; city: string | null };
}

interface PlanosData {
  total: number;
  receitaTotal: number;
  byPlano: Record<string, { count: number; receita: number; saloes: Contrato[] }>;
  contratos: Contrato[];
}

export function MasterPlanos() {
  const { data, isLoading } = useQuery<PlanosData>({
    queryKey: ["master-planos"],
    queryFn: () => fetch("/api/master/planos").then((r) => r.json()),
    staleTime: 30_000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-violet-400" />
      </div>
    );
  }

  const total = data?.total ?? 0;

  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-black text-white">Planos & Distribuição</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Visão geral dos planos ativos em todos os salões
          </p>
        </div>
        <Link
          href="/master/financeiro"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 transition-colors border border-violet-500/20"
        >
          <DollarSign className="w-4 h-4" />
          Ver Financeiro
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Receita total */}
      <div
        className="rounded-2xl p-5 flex items-center gap-5"
        style={{ background: "linear-gradient(135deg,#1e1a3a,#16133a)", border: "1px solid rgba(124,58,237,0.2)" }}
      >
        <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center flex-shrink-0">
          <TrendingUp className="w-6 h-6 text-violet-400" />
        </div>
        <div>
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Receita mensal total</p>
          <p className="text-3xl font-black text-white mt-0.5">{fmt(data?.receitaTotal ?? 0)}</p>
          <p className="text-xs text-zinc-600 mt-0.5">{total} salão{total !== 1 ? "es" : ""} ativo{total !== 1 ? "s" : ""}</p>
        </div>
      </div>

      {/* Tier cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {TIERS.map((tier) => {
          const info = data?.byPlano[tier.tipo] ?? { count: 0, receita: 0, saloes: [] };
          const pct = total > 0 ? Math.round((info.count / total) * 100) : 0;
          const Icon = tier.icon;

          return (
            <div
              key={tier.tipo}
              className={`rounded-2xl overflow-hidden border ${tier.border} shadow-lg ${tier.glow}`}
              style={{ background: "#0e0b1a" }}
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${tier.gradient} p-4 relative overflow-hidden`}>
                <div className="absolute -top-5 -right-5 w-20 h-20 bg-white/10 rounded-full" />
                <div className="relative flex items-center justify-between">
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-2xl font-black text-white">{info.count}</span>
                </div>
                <p className="relative font-black text-white text-base mt-3 leading-none">{tier.nome}</p>
                <p className="relative text-white/65 text-xs mt-0.5">{pct}% dos salões</p>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div>
                  <p className="text-[10px] text-zinc-600 uppercase tracking-widest font-semibold">Receita mensal</p>
                  <p className="text-xl font-black text-white mt-0.5">{fmt(info.receita)}</p>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${tier.gradient} rounded-full transition-all duration-700`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Salons list */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#0e0b1a", border: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Store className="w-4 h-4 text-zinc-500" />
            <h2 className="font-bold text-sm text-zinc-300">Todos os salões com plano ativo</h2>
          </div>
          <span className="text-xs text-zinc-600">{total} no total</span>
        </div>

        {(data?.contratos ?? []).length === 0 ? (
          <div className="py-16 text-center text-zinc-600 text-sm">
            Nenhum salão com contrato ativo
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {(data?.contratos ?? []).map((c) => {
              const tier = TIERS.find((t) => t.tipo === c.plano) ?? TIERS[0];
              const Icon = tier.icon;
              return (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Plan badge */}
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${tier.gradient}`}
                  >
                    <Icon className="w-3.5 h-3.5 text-white" />
                  </div>

                  {/* Salon info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{c.salon.name}</p>
                    <p className="text-xs text-zinc-600">{c.salon.city ?? "—"}</p>
                  </div>

                  {/* Plan label */}
                  <span
                    className="hidden sm:block text-[11px] font-bold px-2 py-0.5 rounded-md"
                    style={{ background: `${tier.cor}18`, color: tier.cor }}
                  >
                    {tier.nome}
                  </span>

                  {/* Value */}
                  <p className="text-sm font-black text-zinc-300 flex-shrink-0">
                    {fmt(Number(c.valorMensal))}
                    <span className="text-zinc-600 font-normal text-[11px]">/mês</span>
                  </p>

                  {/* Link to financeiro */}
                  <Link
                    href="/master/financeiro"
                    className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-700 hover:text-violet-400 hover:bg-violet-500/10 transition-colors flex-shrink-0"
                    title="Ver financeiro"
                  >
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
