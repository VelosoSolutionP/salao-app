"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, Scissors, Users, Package, DollarSign,
  ChevronRight, Clock, Search, Sparkles, Plus,
  ArrowRight, BarChart3, Megaphone, Settings,
} from "lucide-react";
import { cn, formatTime, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { HeraIcon } from "@/components/brand/BrandLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

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
}

// ─── Quick actions ─────────────────────────────────────────────────────────────

const QUICK = [
  { href: "/agenda",         label: "Agenda",    icon: CalendarDays, color: "rgba(124,58,237,0.15)",  fg: "#c4b5fd" },
  { href: "/equipe",         label: "Equipe",    icon: Users,        color: "rgba(37,99,235,0.15)",   fg: "#93c5fd" },
  { href: "/estoque",        label: "Estoque",   icon: Package,      color: "rgba(5,150,105,0.15)",   fg: "#6ee7b7" },
  { href: "/financeiro",     label: "Financeiro",icon: DollarSign,   color: "rgba(217,119,6,0.15)",   fg: "#fcd34d" },
  { href: "/servicos",       label: "Serviços",  icon: Scissors,     color: "rgba(219,39,119,0.15)",  fg: "#f9a8d4" },
  { href: "/transformacoes", label: "Transf.",   icon: Sparkles,     color: "rgba(79,70,229,0.15)",   fg: "#a5b4fc" },
  { href: "/marketing",      label: "Marketing", icon: Megaphone,    color: "rgba(8,145,178,0.15)",   fg: "#67e8f9" },
  { href: "/relatorios",     label: "Relatórios",icon: BarChart3,    color: "rgba(100,116,139,0.15)", fg: "#cbd5e1" },
];

// ─── Status ────────────────────────────────────────────────────────────────────

const STATUS: Record<string, { dot: string; label: string; light: string }> = {
  PENDENTE:       { dot: "#f59e0b", label: "Aguardando", light: "rgba(245,158,11,.15)"  },
  CONFIRMADO:     { dot: "#3b82f6", label: "Confirmado", light: "rgba(59,130,246,.15)"  },
  EM_ANDAMENTO:   { dot: "#7c3aed", label: "Ao vivo",    light: "rgba(124,58,237,.18)"  },
  CONCLUIDO:      { dot: "#10b981", label: "Concluído",  light: "rgba(16,185,129,.12)"  },
  CANCELADO:      { dot: "#ef4444", label: "Cancelado",  light: "rgba(239,68,68,.10)"   },
  NAO_COMPARECEU: { dot: "#6b7280", label: "Não veio",   light: "rgba(107,114,128,.10)" },
};
function st(s: string) { return STATUS[s] ?? STATUS.PENDENTE; }

// ─── Component ─────────────────────────────────────────────────────────────────

export function HomeView({
  greeting,
  salonName,
  salonLogo,
  agendamentosHoje,
  pendentesCount,
}: HomeViewProps) {
  const [search, setSearch] = useState("");

  const today = format(new Date(), "EEE',' dd 'de' MMM", { locale: ptBR });

  const now      = new Date();
  const aoVivo   = agendamentosHoje.filter((a) => a.status === "EM_ANDAMENTO");
  const pending  = agendamentosHoje.filter((a) => a.status === "PENDENTE" || a.status === "CONFIRMADO");
  const next3    = [...aoVivo, ...pending]
    .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
    .slice(0, 3);
  const concluidos = agendamentosHoje.filter((a) => a.status === "CONCLUIDO").length;
  const total      = agendamentosHoje.length;

  // Unique clients from today's appointments
  const clientesHoje = useMemo(() => {
    const seen = new Set<string>();
    return agendamentosHoje
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
      .filter((a) => {
        const n = a.cliente?.user.name ?? "";
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      });
  }, [agendamentosHoje]);

  // Lazy: all clients
  const { data: todosClientes } = useQuery<
    { id: string; nome: string; telefone?: string }[]
  >({
    queryKey: ["home-clientes"],
    queryFn: () =>
      fetch("/api/clientes")
        .then((r) => r.json())
        .then((data: unknown) =>
          Array.isArray(data)
            ? (data as Record<string, unknown>[]).map((c) => ({
                id: c.id as string,
                nome: ((c.user as Record<string, unknown>)?.name ?? c.nome ?? "—") as string,
                telefone: c.telefone as string | undefined,
              }))
            : [],
        ),
    staleTime: 30_000,
  });

  const filteredClientes = useMemo(() => {
    if (!todosClientes) return [];
    if (!search.trim()) return todosClientes.slice(0, 15);
    const q = search.toLowerCase();
    return todosClientes.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 15);
  }, [todosClientes, search]);

  return (
    /*
     * Full-bleed split: negative margins escape the shell's p-5 lg:p-7 padding.
     * Each panel uses min-h to fill the screen without fighting flex/overflow.
     */
    <div className="-m-5 lg:-m-7 grid grid-rows-[1fr] grid-cols-1 lg:grid-cols-2 lg:grid-rows-1">
      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAINEL ESQUERDO — SALÃO (dark, premium)                        */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col overflow-hidden min-h-[calc(50dvh-28px)] lg:min-h-screen"
        style={{ background: "linear-gradient(150deg, #160d30 0%, #0c0917 40%, #0e0b1a 100%)" }}
      >
        {/* Glow top-right */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 480, height: 380, top: -60, right: -80, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(109,40,217,0.22) 0%, transparent 65%)",
            filter: "blur(2px)",
          }}
        />
        {/* Glow bottom-left */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 300, height: 300, bottom: 40, left: -60, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(79,46,220,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Subtle grid pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative flex flex-col h-full p-6 lg:p-8 overflow-y-auto">

          {/* ── Header ────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
                style={
                  salonLogo
                    ? { border: "1.5px solid rgba(255,255,255,0.14)" }
                    : {
                        background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        boxShadow: "0 0 0 1px rgba(124,58,237,.3), 0 4px 20px rgba(124,58,237,.5)",
                      }
                }
              >
                {salonLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
                ) : (
                  <HeraIcon size={18} className="text-white" />
                )}
              </div>
              <div>
                <p className="text-white font-black text-sm leading-tight">{salonName}</p>
                <p className="text-zinc-500 text-[11px] capitalize">{today}</p>
              </div>
            </div>

            <Link
              href="/configuracoes"
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-300 hover:bg-white/5 transition-all"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          {/* ── Label + Greeting ──────────────────────────── */}
          <div className="flex-shrink-0 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(124,58,237,.25)" }}
              >
                <Scissors className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-violet-400 text-xs font-black uppercase tracking-widest">Salão</span>
            </div>
            <p className="text-white font-black leading-tight"
               style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)" }}>
              {greeting}
            </p>
          </div>

          {/* ── Stats pills ───────────────────────────────── */}
          <div className="grid grid-cols-3 gap-2 mb-6 flex-shrink-0">
            {[
              { label: "Total",     value: total,                 color: "#a1a1aa", bg: "rgba(161,161,170,.08)" },
              { label: "Ao vivo",   value: aoVivo.length,         color: "#c4b5fd", bg: "rgba(124,58,237,.18)" },
              { label: "Concluídos",value: concluidos,            color: "#6ee7b7", bg: "rgba(16,185,129,.12)" },
            ].map((s) => (
              <div
                key={s.label}
                className="flex flex-col items-center py-3 rounded-2xl"
                style={{ background: s.bg }}
              >
                <span className="text-xl font-black leading-none" style={{ color: s.color }}>
                  {s.value}
                </span>
                <span className="text-[10px] font-semibold text-zinc-500 mt-1">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── Próximos atendimentos ─────────────────────── */}
          {next3.length > 0 && (
            <div className="mb-5 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">
                Próximos
              </p>
              <div
                className="rounded-2xl overflow-hidden divide-y"
                style={{ background: "rgba(255,255,255,0.04)", borderColor: "rgba(255,255,255,0.05)" }}
              >
                {next3.map((a) => {
                  const s = st(a.status);
                  const servs = a.servicos.map((sv) => sv.servico.nome).join(", ");
                  const isLive = a.status === "EM_ANDAMENTO";
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-3"
                      style={isLive ? { background: "rgba(124,58,237,.10)" } : {}}
                    >
                      <div className="w-10 flex-shrink-0 text-center">
                        <p className="text-xs font-black text-white tabular-nums leading-tight">
                          {formatTime(new Date(a.inicio))}
                        </p>
                      </div>
                      <div
                        className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", isLive && "animate-pulse")}
                        style={{ background: s.dot }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-zinc-200 truncate leading-tight">
                          {a.cliente?.user.name ?? "Cliente"}
                        </p>
                        <p className="text-[11px] text-zinc-600 truncate">{servs}</p>
                      </div>
                      {isLive && (
                        <span
                          className="text-[9px] font-black px-2 py-0.5 rounded-full flex-shrink-0 uppercase tracking-wide"
                          style={{ background: "rgba(124,58,237,.3)", color: "#c4b5fd" }}
                        >
                          AO VIVO
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {agendamentosHoje.length === 0 && (
            <div
              className="flex flex-col items-center py-8 rounded-2xl mb-5 flex-shrink-0 text-center"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <span className="text-3xl mb-2">📅</span>
              <p className="text-zinc-400 text-sm font-bold">Sem agendamentos hoje</p>
              <p className="text-zinc-600 text-xs mt-0.5">Agenda livre</p>
            </div>
          )}

          {/* ── Quick actions ────────────────────────────── */}
          <div className="flex-shrink-0 mb-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-600 mb-2">
              Acesso rápido
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK.map(({ href, label, icon: Icon, color, fg }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-2xl transition-all hover:scale-105 active:scale-95"
                  style={{ background: color }}
                >
                  <Icon className="w-4 h-4" style={{ color: fg }} />
                  <span className="text-[10px] font-bold leading-tight text-center" style={{ color: fg }}>
                    {label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── CTA ──────────────────────────────────────── */}
          <div className="mt-auto flex-shrink-0">
            <Link
              href="/agenda"
              className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
                boxShadow: "0 4px 24px rgba(124,58,237,.4), inset 0 1px 0 rgba(255,255,255,.12)",
              }}
            >
              <span className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4" />
                Abrir agenda completa
              </span>
              <ArrowRight className="w-4 h-4 opacity-70" />
            </Link>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* PAINEL DIREITO — CLIENTES (warm light, premium)                */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div
        className="relative flex flex-col overflow-hidden min-h-[calc(50dvh-28px)] lg:min-h-screen"
        style={{ background: "#f9f6f1" }}
      >
        {/* Warm glow top-left */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 400, height: 300, top: -60, left: -60, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, transparent 65%)",
            filter: "blur(4px)",
          }}
        />
        {/* Warm glow bottom-right */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 300, height: 300, bottom: 0, right: -40, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)",
          }}
        />

        {/* Subtle dot pattern */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: "radial-gradient(circle, #374151 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />

        <div className="relative flex flex-col h-full p-6 lg:p-8 overflow-y-auto">

          {/* ── Header ────────────────────────────────────── */}
          <div className="flex items-center justify-between mb-6 flex-shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div
                  className="w-6 h-6 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(251,191,36,.2)" }}
                >
                  <Users className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-amber-500 text-xs font-black uppercase tracking-widest">Clientes</span>
              </div>
              <p className="text-gray-900 font-black text-xl leading-tight">
                {clientesHoje.length > 0
                  ? `${clientesHoje.length} aqui hoje`
                  : "Nenhum hoje"}
              </p>
            </div>

            <Link
              href="/clientes"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 hover:bg-gray-200/60 transition-all"
            >
              Ver todos <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* ── Search ───────────────────────────────────── */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5 flex-shrink-0"
            style={{ background: "rgba(0,0,0,0.05)" }}
          >
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none font-medium"
            />
          </div>

          {/* ── Hoje no salão ─────────────────────────────── */}
          {!search && clientesHoje.length > 0 && (
            <div className="mb-5 flex-shrink-0">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                Presença de hoje
              </p>
              <div
                className="rounded-2xl overflow-hidden divide-y"
                style={{ background: "white", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}
              >
                {clientesHoje.map((a) => {
                  const s = st(a.status);
                  const servs = a.servicos.map((sv) => sv.servico.nome).join(", ");
                  return (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0"
                    >
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback
                          className="text-xs font-black text-white"
                          style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}
                        >
                          {getInitials(a.cliente?.user.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">
                          {a.cliente?.user.name ?? "Cliente"}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {formatTime(new Date(a.inicio))} · {servs}
                        </p>
                      </div>
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: s.dot }}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Lista filtrada / todos ────────────────────── */}
          <div className="flex-1 min-h-0">
            {(search || clientesHoje.length === 0) && (
              <>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                  {search ? `Resultado para "${search}"` : "Todos os clientes"}
                </p>

                {!todosClientes ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="w-5 h-5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin" />
                  </div>
                ) : filteredClientes.length === 0 ? (
                  <div
                    className="flex flex-col items-center py-10 rounded-2xl text-center"
                    style={{ background: "rgba(0,0,0,0.03)" }}
                  >
                    <span className="text-3xl mb-2">👤</span>
                    <p className="text-sm font-bold text-gray-600">
                      {search ? "Nenhum resultado" : "Nenhum cliente cadastrado"}
                    </p>
                  </div>
                ) : (
                  <div
                    className="rounded-2xl overflow-hidden divide-y"
                    style={{ background: "white", boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}
                  >
                    {filteredClientes.map((c) => (
                      <Link
                        key={c.id}
                        href="/clientes"
                        className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-amber-50/40 transition-colors"
                      >
                        <Avatar className="w-9 h-9 flex-shrink-0">
                          <AvatarFallback
                            className="text-xs font-black text-white"
                            style={{ background: "linear-gradient(135deg,#d97706,#b45309)" }}
                          >
                            {getInitials(c.nome)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800 truncate">{c.nome}</p>
                          {c.telefone && (
                            <p className="text-[11px] text-gray-400 truncate mt-0.5">{c.telefone}</p>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* ── CTAs ─────────────────────────────────────── */}
          <div className="mt-auto pt-5 space-y-2 flex-shrink-0">
            <Link
              href="/agenda"
              className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #111827, #1f2937)",
                boxShadow: "0 4px 20px rgba(0,0,0,.18)",
              }}
            >
              <span className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                Novo agendamento
              </span>
              <ArrowRight className="w-4 h-4 opacity-60" />
            </Link>

            <Link
              href="/clientes"
              className="flex items-center justify-between w-full px-5 py-3.5 rounded-2xl font-bold text-sm transition-all hover:bg-amber-100 active:scale-[0.98]"
              style={{ background: "rgba(251,191,36,.12)", color: "#92400e" }}
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Gerenciar clientes
              </span>
              <ChevronRight className="w-4 h-4 opacity-60" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
