"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "@/providers/ThemeContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import {
  CalendarDays, Scissors, Users, Package, DollarSign,
  ChevronRight, Search, Sparkles, Plus,
  ArrowRight, BarChart3, Megaphone, Settings,
} from "lucide-react";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BellefyIcon } from "@/components/brand/BrandLogo";

export interface ApptItem {
  id: string;
  inicio: Date;
  status: string;
  cliente: { user: { name: string; phone: string | null } } | null;
  colaborador: { id: string; user: { name: string; image: string | null } };
  servicos: Array<{ servico: { nome: string } }>;
}

export interface HomeViewProps {
  greeting: string;
  salonName: string;
  salonLogo?: string | null;
  agendamentosHoje: ApptItem[];
  pendentesCount: number;
  weekData: { label: string; total: number }[];
}

const QUICK = [
  { href: "/agenda",          label: "Agenda",     icon: CalendarDays, from: "#7c3aed", to: "#5b21b6" },
  { href: "/equipe",          label: "Equipe",     icon: Users,        from: "#2563eb", to: "#1d4ed8" },
  { href: "/servicos",        label: "Serviços",   icon: Scissors,     from: "#db2777", to: "#9d174d" },
  { href: "/estoque",         label: "Estoque",    icon: Package,      from: "#059669", to: "#047857" },
  { href: "/financeiro",      label: "Financeiro", icon: DollarSign,   from: "#d97706", to: "#b45309" },
  { href: "/transformacoes",  label: "Transf.",    icon: Sparkles,     from: "#7c3aed", to: "#4338ca" },
  { href: "/marketing",       label: "Marketing",  icon: Megaphone,    from: "#0891b2", to: "#0e7490" },
  { href: "/relatorios",      label: "Relatórios", icon: BarChart3,    from: "#64748b", to: "#475569" },
];

const STATUS: Record<string, { dot: string; label: string }> = {
  PENDENTE:       { dot: "bg-amber-400",                label: "Aguardando" },
  CONFIRMADO:     { dot: "bg-blue-400",                 label: "Confirmado" },
  EM_ANDAMENTO:   { dot: "bg-violet-500 animate-pulse", label: "Ao vivo"    },
  CONCLUIDO:      { dot: "bg-emerald-400",              label: "Concluído"  },
  CANCELADO:      { dot: "bg-red-400",                  label: "Cancelado"  },
  NAO_COMPARECEU: { dot: "bg-gray-300",                 label: "Não veio"   },
};
function st(s: string) { return STATUS[s] ?? STATUS.PENDENTE; }

export function HomeView({ greeting, salonName, salonLogo, agendamentosHoje, weekData }: HomeViewProps) {
  const [tab, setTab] = useState<"salao" | "clientes">("salao");
  const [search, setSearch] = useState("");
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme } = useTheme();
  useEffect(() => setMounted(true), []);
  const isDark = mounted && (resolvedTheme === "dark" || resolvedTheme === "baiano");

  const today = format(new Date(), "EEE',' dd 'de' MMM", { locale: ptBR });

  const aoVivo    = agendamentosHoje.filter((a) => a.status === "EM_ANDAMENTO");
  const pending   = agendamentosHoje.filter((a) => ["PENDENTE", "CONFIRMADO"].includes(a.status));
  const next4     = [...aoVivo, ...pending]
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 4);
  const concluidos = agendamentosHoje.filter((a) => a.status === "CONCLUIDO").length;
  const total      = agendamentosHoje.length;

  const byHour = useMemo(() => {
    const map: Record<number, number> = {};
    agendamentosHoje.forEach((a) => {
      const h = new Date(a.inicio).getHours();
      map[h] = (map[h] || 0) + 1;
    });
    return Array.from({ length: 13 }, (_, i) => ({
      h: `${String(i + 8).padStart(2, "0")}h`,
      v: map[i + 8] || 0,
    }));
  }, [agendamentosHoje]);

  const statusPie = useMemo(() => {
    const counts: Record<string, number> = {};
    agendamentosHoje.forEach((a) => { counts[a.status] = (counts[a.status] || 0) + 1; });
    return [
      { name: "Concluído",  value: counts.CONCLUIDO    || 0, color: "#10b981" },
      { name: "Ao vivo",    value: counts.EM_ANDAMENTO || 0, color: "#8b5cf6" },
      { name: "Confirmado", value: counts.CONFIRMADO   || 0, color: "#3b82f6" },
      { name: "Pendente",   value: counts.PENDENTE     || 0, color: "#f59e0b" },
      { name: "Cancelado",  value: counts.CANCELADO    || 0, color: "#ef4444" },
    ].filter((d) => d.value > 0);
  }, [agendamentosHoje]);

  const clientesHoje = useMemo(() => {
    const seen = new Set<string>();
    return agendamentosHoje
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .filter((a) => {
        const n = a.cliente?.user.name ?? "";
        if (seen.has(n)) return false;
        seen.add(n); return true;
      });
  }, [agendamentosHoje]);

  const { data: todosClientes } = useQuery<{ id: string; nome: string; telefone?: string }[]>({
    queryKey: ["home-clientes"],
    queryFn: () =>
      fetch("/api/clientes").then((r) => r.json()).then((data: unknown) =>
        Array.isArray(data)
          ? (data as Record<string, unknown>[]).map((c) => ({
              id: c.id as string,
              nome: ((c.user as Record<string, unknown>)?.name ?? c.nome ?? "—") as string,
              telefone: c.telefone as string | undefined,
            }))
          : []
      ),
    staleTime: 30_000,
  });

  const filteredClientes = useMemo(() => {
    if (!todosClientes) return [];
    if (!search.trim()) return todosClientes.slice(0, 20);
    const q = search.toLowerCase();
    return todosClientes.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 20);
  }, [todosClientes, search]);

  return (
    <div
      className="-m-5 lg:-m-7 flex flex-col"
      style={{
        minHeight: "100dvh",
        background: isDark
          ? "linear-gradient(155deg,#08061a 0%,#130e30 45%,#0a0818 100%)"
          : "var(--background)",
      }}
    >
      {/* Glows — dark only */}
      {isDark && (
        <>
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            <div className="absolute -top-40 -left-32 w-[500px] h-[500px] rounded-full"
              style={{ background: "radial-gradient(circle,rgba(124,58,237,.18) 0%,transparent 65%)", filter: "blur(4px)" }} />
            <div className="absolute -bottom-40 right-0 w-[400px] h-[400px] rounded-full"
              style={{ background: "radial-gradient(circle,rgba(79,70,229,.14) 0%,transparent 65%)" }} />
          </div>
          <svg className="pointer-events-none fixed inset-0 w-full h-full opacity-[0.022]" aria-hidden>
            <defs>
              <pattern id="hg" width="48" height="48" patternUnits="userSpaceOnUse">
                <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#hg)" />
          </svg>
        </>
      )}

      {/* Header */}
      <div className="relative z-10 px-5 lg:px-8 pt-6 pb-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={salonLogo
              ? { border: "1.5px solid rgba(255,255,255,0.14)" }
              : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 0 0 1px rgba(124,58,237,.3),0 4px 16px rgba(124,58,237,.5)" }}>
            {salonLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
            ) : (
              <BellefyIcon size={16} className="text-white" />
            )}
          </div>
          <div>
            <p className="text-foreground font-black text-sm leading-tight">{salonName}</p>
            <p className="text-muted-foreground text-[11px] capitalize">{today}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <p className="text-muted-foreground text-sm hidden sm:block">{greeting.replace(/!$/, "")}</p>
          <Link href="/configuracoes" className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="relative z-10 px-5 lg:px-8 pb-4 flex-shrink-0">
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Total hoje",  value: total,          color: "#a1a1aa", bg: "rgba(161,161,170,.08)" },
            { label: "Ao vivo",     value: aoVivo.length,  color: "#c4b5fd", bg: "rgba(124,58,237,.18)"  },
            { label: "Concluídos",  value: concluidos,     color: "#6ee7b7", bg: "rgba(16,185,129,.12)"  },
            { label: "Aguardando",  value: pending.length, color: "#fcd34d", bg: "rgba(245,158,11,.12)"  },
          ].map((s) => (
            <div key={s.label} className="flex flex-col items-center py-3 rounded-2xl"
              style={{ background: s.bg }}>
              <span className="text-2xl font-black leading-none" style={{ color: s.color }}>{s.value}</span>
              <span className="text-[10px] font-semibold text-zinc-600 mt-1 text-center">{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mobile tab bar */}
      <div className="relative z-10 px-5 pb-4 flex-shrink-0 lg:hidden">
        <div className="flex gap-1.5 p-1.5 rounded-2xl"
          style={{ background: "rgba(0,0,0,.35)", border: "1px solid rgba(255,255,255,.06)" }}>
          <TabBtn active={tab === "salao"} onClick={() => setTab("salao")}>
            <Scissors className="w-3.5 h-3.5" /> Salão
          </TabBtn>
          <TabBtn active={tab === "clientes"} onClick={() => setTab("clientes")} amber>
            <Users className="w-3.5 h-3.5" /> Clientes
          </TabBtn>
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 lg:px-8 pb-8">

        {/* ── Gráfico semanal full-width (mobile + desktop) ── */}
        <div className="mb-5 rounded-2xl p-5"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Agendamentos</p>
              <p className="text-2xl font-black text-foreground">{weekData.reduce((s, d) => s + d.total, 0)}<span className="text-sm font-semibold text-zinc-500 ml-1">últimos 7 dias</span></p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-violet-500" />
              <span className="text-[11px] text-zinc-500 font-semibold">Atendimentos</span>
            </div>
          </div>
          <div className="h-48 sm:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData} barCategoryGap="28%" margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={1} />
                    <stop offset="100%" stopColor="#4f46e5" stopOpacity={0.7} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="label" tick={{ fill: "#52525b", fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  contentStyle={{ background: "#0f0c24", border: "1px solid rgba(124,58,237,.3)", borderRadius: 14, fontSize: 13, color: "#e4e4e7", padding: "8px 14px" }}
                  cursor={{ fill: "rgba(124,58,237,.1)", rx: 6 }}
                  formatter={(v) => [v, "Agendamentos"]}
                />
                <Bar dataKey="total" fill="url(#barGrad)" radius={[8, 8, 0, 0]} maxBarSize={52} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── DESKTOP: 2-col grid ── */}
        <div className="hidden lg:grid lg:grid-cols-[1fr_340px] gap-5">

          {/* Left: agenda */}
          <div className="space-y-4">
            {next4.length > 0 && (
              <div>
                <SectionLabel>Próximos atendimentos</SectionLabel>
                <ApptList items={next4} showLive />
              </div>
            )}
            {total === 0 && <EmptyCard icon="📅" title="Nenhum agendamento hoje" sub="Agenda livre" />}
            {total > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel noMargin>Agenda de hoje · {total}</SectionLabel>
                  <Link href="/agenda" className="flex items-center gap-1 text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
                    Ver tudo <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
                <ApptList items={agendamentosHoje.slice().sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())} showStatus dim />
              </div>
            )}
            <Link href="/agenda"
              className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 24px rgba(124,58,237,.35),inset 0 1px 0 rgba(255,255,255,.1)" }}>
              <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Novo agendamento</span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </Link>
          </div>

          {/* Right: status donut + hora + quick access */}
          <div className="space-y-4">

            {/* Status donut */}
            {statusPie.length > 0 ? (
              <div className="rounded-2xl p-4 bg-card border border-border">
                <SectionLabel>Status de hoje</SectionLabel>
                <div className="flex items-center gap-4">
                  <div className="h-24 w-24 flex-shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={statusPie} cx="50%" cy="50%" innerRadius={26} outerRadius={42} dataKey="value" strokeWidth={0}>
                          {statusPie.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex-1 space-y-2">
                    {statusPie.map((d) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-[11px] text-zinc-400 flex-1">{d.name}</span>
                        <span className="text-[11px] font-black text-zinc-300">{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl p-4 bg-card border border-border">
                <SectionLabel>Status de hoje</SectionLabel>
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados ainda</p>
              </div>
            )}

            {/* By hour */}
            <div className="rounded-2xl p-4 bg-card border border-border">
              <SectionLabel>Distribuição por hora</SectionLabel>
              <div className="h-28">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={byHour} barCategoryGap="20%">
                    <XAxis dataKey="h" tick={{ fill: "#3f3f46", fontSize: 9 }} axisLine={false} tickLine={false} interval={1} />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{ background: "#130e30", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12, color: "#e4e4e7" }}
                      cursor={{ fill: "rgba(124,58,237,.12)" }}
                    />
                    <Bar dataKey="v" name="Agendamentos" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick access */}
            <div>
              <SectionLabel>Acesso rápido</SectionLabel>
              <div className="grid grid-cols-4 gap-2">
                {QUICK.map(({ href, label, icon: Icon, from, to }) => (
                  <Link key={href} href={href}
                    className="flex flex-col items-center gap-2 py-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
                    style={{ background: `linear-gradient(135deg,${from}22,${to}18)`, border: `1px solid ${from}33` }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                      <Icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="text-[9px] font-bold text-zinc-400 text-center leading-tight">{label}</span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── MOBILE: tabs ── */}
        <div className="lg:hidden">
          {tab === "salao" && (
            <div className="space-y-4">
              {next4.length > 0 && (
                <div>
                  <SectionLabel>Próximos atendimentos</SectionLabel>
                  <ApptList items={next4} showLive />
                </div>
              )}
              {total === 0 && <EmptyCard icon="📅" title="Nenhum agendamento hoje" sub="Agenda livre" />}
              <div>
                <SectionLabel>Acesso rápido</SectionLabel>
                <div className="grid grid-cols-4 gap-2">
                  {QUICK.map(({ href, label, icon: Icon, from, to }) => (
                    <Link key={href} href={href}
                      className="flex flex-col items-center gap-2 py-3.5 rounded-2xl transition-all hover:scale-105 active:scale-95"
                      style={{ background: `linear-gradient(135deg,${from}22,${to}18)`, border: `1px solid ${from}33` }}>
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: `linear-gradient(135deg,${from},${to})` }}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-[10px] font-bold text-zinc-400 text-center leading-tight">{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
              {total > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <SectionLabel noMargin>Agenda de hoje · {total}</SectionLabel>
                    <Link href="/agenda" className="flex items-center gap-1 text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
                      Ver tudo <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                  <ApptList items={agendamentosHoje.slice().sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())} showStatus dim />
                </div>
              )}
              <Link href="/agenda"
                className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#7c3aed,#5b21b6)", boxShadow: "0 4px 24px rgba(124,58,237,.35),inset 0 1px 0 rgba(255,255,255,.1)" }}>
                <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Novo agendamento</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </Link>
            </div>
          )}

          {tab === "clientes" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-card border border-border">
                <Search className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                <input type="text" placeholder="Buscar cliente..." value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-foreground placeholder-muted-foreground outline-none font-medium" />
              </div>
              {!search && clientesHoje.length > 0 && (
                <div>
                  <SectionLabel>Hoje no salão · {clientesHoje.length}</SectionLabel>
                  <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.04]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                    {clientesHoje.map((a) => {
                      const s = st(a.status);
                      return (
                        <div key={a.id} className="flex items-center gap-3 px-4 py-3">
                          <Avatar className="w-9 h-9 flex-shrink-0">
                            <AvatarFallback className="text-xs font-black text-white"
                              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                              {getInitials(a.cliente?.user.name ?? "?")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[13px] font-bold text-foreground truncate leading-tight">
                              {a.cliente?.user.name ?? "Cliente"}
                            </p>
                            <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                              {formatTime(new Date(a.inicio))} · {a.servicos.map((sv) => sv.servico.nome).join(", ")}
                            </p>
                          </div>
                          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SectionLabel noMargin>
                    {search ? `Resultados para "${search}"` : "Todos os clientes"}
                  </SectionLabel>
                  {!search && (
                    <Link href="/clientes" className="flex items-center gap-1 text-violet-400 text-xs font-bold hover:text-violet-300 transition-colors">
                      Ver todos <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
                {!todosClientes ? (
                  <div className="flex justify-center py-10">
                    <div className="w-5 h-5 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
                  </div>
                ) : filteredClientes.length === 0 ? (
                  <EmptyCard icon="👤"
                    title={search ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
                    sub={search ? "Tente outro nome" : "Adicione o primeiro cliente"} />
                ) : (
                  <div className="rounded-2xl overflow-hidden divide-y divide-white/[0.04]"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,.07)" }}>
                    {filteredClientes.map((c) => (
                      <Link key={c.id} href="/clientes"
                        className="flex items-center gap-3 px-4 py-3 hover:bg-accent transition-colors">
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarFallback className="text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}>
                            {getInitials(c.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-foreground truncate">{c.nome}</p>
                          {c.telefone && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{c.telefone}</p>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
              <Link href="/clientes"
                className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: "linear-gradient(135deg,#1d4ed8,#1e3a8a)", boxShadow: "0 4px 24px rgba(29,78,216,.3),inset 0 1px 0 rgba(255,255,255,.1)" }}>
                <span className="flex items-center gap-2"><Plus className="w-4 h-4" />Novo cliente</span>
                <ArrowRight className="w-4 h-4 opacity-70" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApptList({
  items, showLive, showStatus, dim,
}: {
  items: ApptItem[];
  showLive?: boolean;
  showStatus?: boolean;
  dim?: boolean;
}) {
  return (
    <div className="rounded-2xl overflow-hidden divide-y divide-border bg-card border border-border">
      {items.map((a) => {
        const s = st(a.status);
        const live = a.status === "EM_ANDAMENTO";
        const faded = dim && ["CANCELADO", "NAO_COMPARECEU"].includes(a.status);
        return (
          <div key={a.id}
            className={cn("flex items-center gap-3 px-4 py-3", faded && "opacity-40", live && "bg-violet-900/20")}
            style={showLive && live ? { background: "rgba(124,58,237,.1)" } : {}}>
            <p className="w-11 text-xs font-black text-foreground tabular-nums flex-shrink-0">
              {formatTime(new Date(a.inicio))}
            </p>
            <div className={cn("w-2 h-2 rounded-full flex-shrink-0", s.dot)} />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-foreground truncate leading-tight">
                {a.cliente?.user.name ?? "Cliente"}
              </p>
              <p className="text-[11px] text-muted-foreground truncate">
                {a.servicos.map((sv) => sv.servico.nome).join(", ")}
              </p>
            </div>
            {showLive && live && (
              <span className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide"
                style={{ background: "rgba(124,58,237,.3)", color: "#c4b5fd" }}>
                AO VIVO
              </span>
            )}
            {showStatus && !live && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 bg-white/5 text-zinc-500">
                {s.label}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TabBtn({ children, active, onClick, amber }: {
  children: React.ReactNode; active: boolean; onClick: () => void; amber?: boolean;
}) {
  return (
    <button type="button" onClick={onClick}
      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
      style={active
        ? amber
          ? { background: "linear-gradient(135deg,rgba(217,119,6,.3),rgba(180,83,9,.25))", color: "#fcd34d", boxShadow: "0 2px 12px rgba(217,119,6,.18)", border: "1px solid rgba(217,119,6,.32)" }
          : { background: "linear-gradient(135deg,rgba(124,58,237,.32),rgba(79,70,229,.28))", color: "#c4b5fd", boxShadow: "0 2px 12px rgba(124,58,237,.22)", border: "1px solid rgba(124,58,237,.38)" }
        : { color: "#52525b", border: "1px solid transparent" }}>
      {children}
    </button>
  );
}

function SectionLabel({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <p className={cn("text-[10px] font-black uppercase tracking-widest text-muted-foreground", !noMargin && "mb-2")}>
      {children}
    </p>
  );
}

function EmptyCard({ icon, title, sub }: { icon: string; title: string; sub: string }) {
  return (
    <div className="flex flex-col items-center py-12 rounded-2xl text-center bg-card border border-border">
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-black text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}
