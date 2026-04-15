"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Store, Users, TrendingUp, DollarSign, ShieldOff, Clock,
  CheckCircle, XCircle, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashData {
  kpis: {
    totalSaloes: number;
    saloesTrial: number;
    saloesAtivos: number;
    saloesBloqueados: number;
    totalOwners: number;
    mrr: number;
    gastosMes: number;
    lucroBruto: number;
  };
  crescimento: { mes: string; saloes: number }[];
  saloesRecentes: {
    id: string;
    name: string;
    city: string | null;
    createdAt: string;
    contratos: { valorMensal: number }[];
    owner: { id: string; name: string; email: string; blocked: boolean; trialExpires: string | null };
  }[];
}

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function StatusBadge({ owner }: { owner: DashData["saloesRecentes"][0]["owner"] }) {
  if (owner.blocked)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Bloqueado</span>;
  if (owner.trialExpires && new Date(owner.trialExpires) > new Date())
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400">Trial</span>;
  if (!owner.trialExpires)
    return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-400">Ativo</span>;
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Expirado</span>;
}

export function MasterDashboard() {
  const qc = useQueryClient();
  const [actionId, setActionId] = useState<string | null>(null);

  const { data, isLoading } = useQuery<DashData>({
    queryKey: ["master-dashboard"],
    queryFn: () => fetch("/api/master/dashboard").then((r) => r.json()),
    staleTime: 30_000,
  });

  async function toggleBlock(ownerId: string, blocked: boolean) {
    setActionId(ownerId);
    try {
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ownerId, blocked: !blocked }),
      });
      if (!res.ok) throw new Error();
      toast.success(blocked ? "Acesso liberado" : "Usuário bloqueado");
      qc.invalidateQueries({ queryKey: ["master-dashboard"] });
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setActionId(null);
    }
  }


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const { kpis, crescimento = [], saloesRecentes = [] } = data ?? { kpis: {} as DashData["kpis"], crescimento: [], saloesRecentes: [] };
  const maxSaloes = Math.max(...crescimento.map((c) => c.saloes), 1);

  const KPI_CARDS = [
    { label: "Salões cadastrados", value: kpis.totalSaloes, icon: Store, color: "#7c3aed" },
    { label: "Em trial ativo", value: kpis.saloesTrial, icon: Clock, color: "#f59e0b" },
    { label: "MRR (contratos)", value: fmt(kpis.mrr ?? 0), icon: DollarSign, color: "#10b981" },
    { label: "Lucro do mês", value: fmt(kpis.lucroBruto ?? 0), icon: TrendingUp, color: (kpis.lucroBruto ?? 0) >= 0 ? "#10b981" : "#ef4444" },
    { label: "Bloqueados", value: kpis.saloesBloqueados, icon: ShieldOff, color: "#ef4444" },
    { label: "Gastos do mês", value: fmt(kpis.gastosMes ?? 0), icon: BarChart3, color: "#6366f1" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard Master</h1>
        <p className="text-zinc-500 text-sm mt-0.5">Visão geral da plataforma Bellefy</p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {KPI_CARDS.map(({ label, value, icon: Icon, color }) => (
          <div
            key={label}
            className="rounded-2xl p-4"
            style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-zinc-500 text-xs font-medium mb-1">{label}</p>
                <p className="text-white font-black text-xl">{value ?? "—"}</p>
              </div>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}20` }}>
                <Icon className="w-4.5 h-4.5" style={{ color }} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Crescimento */}
        <div
          className="lg:col-span-1 rounded-2xl p-5"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <p className="text-white font-black text-sm mb-4">Novos salões (6 meses)</p>
          <div className="flex items-end gap-1.5 h-28">
            {crescimento.map(({ mes, saloes }) => (
              <div key={mes} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-t-md transition-all"
                  style={{
                    height: `${Math.max((saloes / maxSaloes) * 100, 4)}%`,
                    background: "linear-gradient(180deg,#7c3aed,#4f46e5)",
                    minHeight: "4px",
                  }}
                />
                <span className="text-[9px] text-zinc-600 font-medium">{mes}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Resumo financeiro */}
        <div
          className="lg:col-span-2 rounded-2xl p-5"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-black text-sm">Resumo financeiro do mês</p>
            <a href="/master/financeiro" className="text-violet-400 text-xs hover:underline">
              Ver detalhes →
            </a>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Receita (MRR)", value: fmt(kpis.mrr ?? 0), color: "#10b981" },
              { label: "Gastos", value: fmt(kpis.gastosMes ?? 0), color: "#ef4444" },
              { label: "Lucro líquido", value: fmt(kpis.lucroBruto ?? 0), color: (kpis.lucroBruto ?? 0) >= 0 ? "#10b981" : "#ef4444" },
            ].map(({ label, value, color }) => (
              <div key={label} className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
                <p className="text-zinc-500 text-[11px] font-medium mb-1">{label}</p>
                <p className="font-black text-base" style={{ color }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Salões recentes */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <p className="text-white font-black text-sm">Salões cadastrados</p>
          <a href="/master/saloes" className="text-violet-400 text-xs hover:underline">Ver todos →</a>
        </div>

        <div className="divide-y divide-white/5">
          {saloesRecentes.map((salon) => (
            <div key={salon.id} className="flex items-center gap-3 px-5 py-3">
              {/* Avatar */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
              >
                {salon.name.charAt(0).toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-white text-sm font-semibold truncate">{salon.name}</span>
                  <StatusBadge owner={salon.owner} />
                </div>
                <p className="text-zinc-600 text-xs mt-0.5 truncate">
                  {salon.owner.name} · {salon.city ?? "—"} ·{" "}
                  {formatDistanceToNow(new Date(salon.createdAt), { addSuffix: true, locale: ptBR })}
                </p>
              </div>

              {/* Contrato */}
              <div className="text-right hidden sm:block flex-shrink-0">
                <p className="text-zinc-400 text-xs font-semibold">
                  {salon.contratos[0] ? fmt(Number(salon.contratos[0].valorMensal)) + "/mês" : "Sem contrato"}
                </p>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  title={salon.owner.blocked ? "Desbloquear" : "Bloquear"}
                  disabled={actionId === salon.owner.id}
                  onClick={() => toggleBlock(salon.owner.id, salon.owner.blocked)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                  style={{ background: salon.owner.blocked ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)" }}
                >
                  {salon.owner.blocked
                    ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                </button>
              </div>
            </div>
          ))}

          {saloesRecentes.length === 0 && (
            <p className="px-5 py-8 text-center text-zinc-600 text-sm">Nenhum salão cadastrado ainda</p>
          )}
        </div>
      </div>
    </div>
  );
}
