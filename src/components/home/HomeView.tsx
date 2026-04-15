"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarDays, Scissors, Users, Package, DollarSign,
  ChevronRight, Clock, Search, Sparkles, Plus,
  Star, BarChart3, Megaphone, UserPlus, Settings,
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
  { href: "/agenda",         label: "Agenda",          icon: CalendarDays, from: "#7c3aed", to: "#5b21b6" },
  { href: "/clientes",       label: "Clientes",         icon: Users,        from: "#2563eb", to: "#1d4ed8" },
  { href: "/servicos",       label: "Serviços",         icon: Scissors,     from: "#db2777", to: "#9d174d" },
  { href: "/estoque",        label: "Estoque",          icon: Package,      from: "#059669", to: "#047857" },
  { href: "/financeiro",     label: "Financeiro",       icon: DollarSign,   from: "#d97706", to: "#b45309" },
  { href: "/transformacoes", label: "Transformações",   icon: Sparkles,     from: "#7c3aed", to: "#4338ca" },
  { href: "/marketing",      label: "Marketing",        icon: Megaphone,    from: "#0891b2", to: "#0e7490" },
  { href: "/relatorios",     label: "Relatórios",       icon: BarChart3,    from: "#64748b", to: "#475569" },
];

// ─── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { dot: string; label: string; pill: string }> = {
  PENDENTE:       { dot: "bg-amber-400",                   label: "Aguardando",  pill: "bg-amber-50 text-amber-700 border border-amber-100" },
  CONFIRMADO:     { dot: "bg-blue-400",                    label: "Confirmado",  pill: "bg-blue-50 text-blue-700 border border-blue-100" },
  EM_ANDAMENTO:   { dot: "bg-violet-500 animate-pulse",    label: "Ao vivo",     pill: "bg-violet-100 text-violet-700 border border-violet-200" },
  CONCLUIDO:      { dot: "bg-emerald-400",                 label: "Concluído",   pill: "bg-emerald-50 text-emerald-700 border border-emerald-100" },
  CANCELADO:      { dot: "bg-red-400",                     label: "Cancelado",   pill: "bg-red-50 text-red-500 border border-red-100" },
  NAO_COMPARECEU: { dot: "bg-gray-300",                    label: "Não veio",    pill: "bg-gray-100 text-gray-400 border border-gray-100" },
};

function getStatus(s: string) {
  return STATUS[s] ?? STATUS.PENDENTE;
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function HomeView({
  greeting,
  salonName,
  salonLogo,
  agendamentosHoje,
  pendentesCount,
}: HomeViewProps) {
  const [tab, setTab] = useState<"salao" | "clientes">("salao");
  const [search, setSearch] = useState("");

  const today = format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR });

  // Próximo agendamento (pendente ou confirmado mais próximo)
  const proximo = useMemo(() => {
    const now = new Date();
    return agendamentosHoje
      .filter((a) => (a.status === "PENDENTE" || a.status === "CONFIRMADO") && new Date(a.inicio) >= now)
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())[0] ?? null;
  }, [agendamentosHoje]);

  // EM_ANDAMENTO
  const aoVivo = useMemo(
    () => agendamentosHoje.filter((a) => a.status === "EM_ANDAMENTO"),
    [agendamentosHoje],
  );

  // Clientes de hoje (únicos, para a tab Clientes)
  const clientesHoje = useMemo(() => {
    const seen = new Set<string>();
    return agendamentosHoje
      .filter((a) => {
        const n = a.cliente?.user.name ?? "";
        if (seen.has(n)) return false;
        seen.add(n);
        return true;
      })
      .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime());
  }, [agendamentosHoje]);

  // Lazy: all clients (only fetched when Clientes tab is open)
  const { data: todosClientes } = useQuery<{ id: string; nome: string; telefone?: string; ultimaVisita?: string }[]>({
    queryKey: ["home-clientes"],
    queryFn: () => fetch("/api/clientes").then((r) => r.json()),
    enabled: tab === "clientes",
    staleTime: 30_000,
    select: (data) =>
      Array.isArray(data)
        ? data.map((c: { id: string; user?: { name: string }; nome?: string; telefone?: string; ultimaVisita?: string }) => ({
            id: c.id,
            nome: c.user?.name ?? c.nome ?? "—",
            telefone: c.telefone,
            ultimaVisita: c.ultimaVisita,
          }))
        : [],
  });

  const filteredClientes = useMemo(() => {
    if (!todosClientes) return [];
    if (!search.trim()) return todosClientes.slice(0, 20);
    const q = search.toLowerCase();
    return todosClientes.filter((c) => c.nome.toLowerCase().includes(q)).slice(0, 20);
  }, [todosClientes, search]);

  const concluidos = agendamentosHoje.filter((a) => a.status === "CONCLUIDO").length;
  const total      = agendamentosHoje.length;

  return (
    <div className="max-w-2xl mx-auto space-y-4 pb-10">

      {/* ── Hero card ─────────────────────────────────────────────────────── */}
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #1a0f2e 0%, #0e0b1a 60%, #160d30 100%)",
          boxShadow: "0 8px 40px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Decorative glow */}
        <div
          className="absolute pointer-events-none"
          style={{
            width: 320, height: 200, borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 70%)",
            top: 0, right: -40,
          }}
        />

        <div className="relative px-5 pt-5 pb-4">
          {/* Salon identity */}
          <div className="flex items-center gap-3 mb-4">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={
                salonLogo
                  ? { border: "1.5px solid rgba(255,255,255,0.15)" }
                  : {
                      background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                      boxShadow: "0 0 0 1px rgba(124,58,237,.35), 0 4px 20px rgba(124,58,237,.5)",
                    }
              }
            >
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
              ) : (
                <HeraIcon size={16} className="text-white" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-black text-sm truncate leading-tight">{salonName}</p>
              <p className="text-zinc-500 text-[11px] capitalize mt-0.5">{today}</p>
            </div>
            <Link
              href="/configuracoes"
              className="p-2 rounded-xl text-zinc-600 hover:text-zinc-400 hover:bg-white/5 transition-all"
            >
              <Settings className="w-4 h-4" />
            </Link>
          </div>

          {/* Greeting */}
          <p className="text-white font-black text-2xl leading-tight mb-1">{greeting}</p>
          {total > 0 ? (
            <p className="text-zinc-400 text-sm">
              {total} {total === 1 ? "atendimento" : "atendimentos"} hoje
              {concluidos > 0 && (
                <> · <span className="text-emerald-400">{concluidos} concluído{concluidos !== 1 && "s"}</span></>
              )}
            </p>
          ) : (
            <p className="text-zinc-500 text-sm">Nenhum agendamento para hoje</p>
          )}

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {(["salao", "clientes"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "flex-1 py-2 rounded-xl text-sm font-bold transition-all",
                  tab === t
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                    : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-zinc-200",
                )}
              >
                {t === "salao" ? "✂ Salão" : "👥 Clientes"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* SALÃO TAB                                                              */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "salao" && (
        <>
          {/* ── Em atendimento ─────────────────────────────────────────── */}
          {aoVivo.length > 0 && (
            <div>
              <SectionLabel label="Ao vivo" />
              <div className="space-y-2">
                {aoVivo.map((a) => (
                  <ApptCard key={a.id} appt={a} highlight />
                ))}
              </div>
            </div>
          )}

          {/* ── Próximo ─────────────────────────────────────────────────── */}
          {proximo && aoVivo.length === 0 && (
            <div>
              <SectionLabel label="Próximo atendimento" />
              <ApptCard appt={proximo} highlight />
            </div>
          )}

          {/* ── Quick actions ────────────────────────────────────────────── */}
          <div>
            <SectionLabel label="Acesso rápido" />
            <div className="grid grid-cols-4 gap-2.5">
              {QUICK.map(({ href, label, icon: Icon, from, to }) => (
                <Link
                  key={href}
                  href={href}
                  className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-white hover:scale-[1.04] active:scale-[0.97] transition-transform"
                  style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-gray-600 text-center leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* ── Agenda de hoje ──────────────────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel label={`Hoje · ${total} atendimento${total !== 1 ? "s" : ""}`} noMargin />
              <Link
                href="/agenda"
                className="flex items-center gap-1 text-violet-600 text-xs font-bold hover:text-violet-700 transition-colors"
              >
                Ver agenda <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {agendamentosHoje.length === 0 ? (
              <EmptyCard
                icon="📅"
                title="Nenhum agendamento hoje"
                sub="Que tal criar o primeiro?"
                cta={{ label: "Novo agendamento", href: "/agenda" }}
              />
            ) : (
              <div
                className="rounded-2xl overflow-hidden bg-white"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
              >
                {agendamentosHoje
                  .sort((a, b) => new Date(a.inicio).getTime() - new Date(b.inicio).getTime())
                  .map((appt, i) => {
                    const st = getStatus(appt.status);
                    const servs = appt.servicos.map((s) => s.servico.nome).join(" · ");
                    const isDim = appt.status === "CANCELADO" || appt.status === "NAO_COMPARECEU" || appt.status === "CONCLUIDO";
                    return (
                      <div
                        key={appt.id}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3",
                          i > 0 && "border-t border-gray-50",
                          appt.status === "EM_ANDAMENTO" && "bg-violet-50/60",
                          isDim && "opacity-50",
                        )}
                      >
                        {/* Time */}
                        <div className="w-12 flex-shrink-0">
                          <p className={cn("text-[13px] font-black tabular-nums", isDim ? "text-gray-400" : "text-gray-800")}>
                            {formatTime(new Date(appt.inicio))}
                          </p>
                        </div>

                        {/* Dot */}
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", st.dot)} />

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">
                            {appt.cliente?.user.name ?? "Cliente"}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-0.5">{servs}</p>
                        </div>

                        {/* Status pill */}
                        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", st.pill)}>
                          {st.label}
                        </span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* ── Novo agendamento CTA ─────────────────────────────────────── */}
          <Link
            href="/agenda"
            className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
              boxShadow: "0 4px 20px rgba(124,58,237,.4)",
            }}
          >
            <span className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Novo agendamento
            </span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </Link>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════ */}
      {/* CLIENTES TAB                                                           */}
      {/* ══════════════════════════════════════════════════════════════════════ */}
      {tab === "clientes" && (
        <>
          {/* Search */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white"
            style={{ boxShadow: "0 2px 12px rgba(0,0,0,0.07)" }}
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

          {/* Hoje no salão */}
          {clientesHoje.length > 0 && !search && (
            <div>
              <SectionLabel label="Hoje no salão" />
              <div
                className="rounded-2xl overflow-hidden bg-white"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
              >
                {clientesHoje.map((appt, i) => {
                  const st = getStatus(appt.status);
                  const servs = appt.servicos.map((s) => s.servico.nome).join(", ");
                  return (
                    <div
                      key={appt.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3",
                        i > 0 && "border-t border-gray-50",
                      )}
                    >
                      <Avatar className="w-9 h-9 flex-shrink-0">
                        <AvatarFallback
                          className="text-xs font-black"
                          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
                        >
                          {getInitials(appt.cliente?.user.name ?? "?")}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-bold text-gray-800 truncate leading-tight">
                          {appt.cliente?.user.name ?? "Cliente"}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {formatTime(new Date(appt.inicio))} · {servs}
                        </p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0", st.pill)}>
                        {st.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Todos os clientes / resultado da busca */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <SectionLabel
                label={search ? `Resultados para "${search}"` : "Todos os clientes"}
                noMargin
              />
              {!search && (
                <Link
                  href="/clientes"
                  className="flex items-center gap-1 text-violet-600 text-xs font-bold hover:text-violet-700 transition-colors"
                >
                  Ver todos <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>

            {!todosClientes ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 rounded-full border-2 border-violet-500 border-t-transparent animate-spin" />
              </div>
            ) : filteredClientes.length === 0 ? (
              <EmptyCard
                icon="👤"
                title={search ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
                sub={search ? "Tente outro nome" : "Adicione o primeiro cliente"}
                cta={!search ? { label: "Novo cliente", href: "/clientes" } : undefined}
              />
            ) : (
              <div
                className="rounded-2xl overflow-hidden bg-white"
                style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
              >
                {filteredClientes.map((c, i) => (
                  <Link
                    key={c.id}
                    href={`/clientes`}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors",
                      i > 0 && "border-t border-gray-50",
                    )}
                  >
                    <Avatar className="w-9 h-9 flex-shrink-0">
                      <AvatarFallback
                        className="text-xs font-black"
                        style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
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
          </div>

          {/* CTA novo cliente */}
          <Link
            href="/clientes"
            className="flex items-center justify-between w-full px-5 py-4 rounded-2xl text-white font-bold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
            style={{
              background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
              boxShadow: "0 4px 20px rgba(37,99,235,.35)",
            }}
          >
            <span className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Novo cliente
            </span>
            <ChevronRight className="w-4 h-4 opacity-70" />
          </Link>
        </>
      )}
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ label, noMargin }: { label: string; noMargin?: boolean }) {
  return (
    <p className={cn("text-[11px] font-black uppercase tracking-widest text-gray-400", !noMargin && "mb-2")}>
      {label}
    </p>
  );
}

function ApptCard({ appt, highlight }: { appt: ApptItem; highlight?: boolean }) {
  const st = getStatus(appt.status);
  const servs = appt.servicos.map((s) => s.servico.nome).join(" · ");

  return (
    <div
      className="rounded-2xl overflow-hidden bg-white"
      style={{ boxShadow: highlight ? "0 4px 24px rgba(124,58,237,.15)" : "0 2px 12px rgba(0,0,0,0.07)" }}
    >
      <div
        className="h-1 w-full"
        style={{
          background:
            appt.status === "EM_ANDAMENTO"
              ? "linear-gradient(90deg, #7c3aed, #4f46e5)"
              : appt.status === "CONCLUIDO"
              ? "linear-gradient(90deg, #059669, #047857)"
              : "linear-gradient(90deg, #d97706, #b45309)",
        }}
      />
      <div className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="w-11 h-11 flex-shrink-0">
            <AvatarImage src={appt.colaborador.user.image ?? ""} />
            <AvatarFallback
              className="text-xs font-black"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
            >
              {getInitials(appt.colaborador.user.name)}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-black text-gray-900 leading-tight">
                {appt.cliente?.user.name ?? "Cliente"}
              </p>
              <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", st.pill)}>
                {st.label}
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{servs}</p>
          </div>

          <div className="flex flex-col items-end flex-shrink-0">
            <div className="flex items-center gap-1 text-gray-700">
              <Clock className="w-3 h-3" />
              <span className="text-sm font-black tabular-nums">{formatTime(new Date(appt.inicio))}</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-0.5">{appt.colaborador.user.name}</p>
          </div>
        </div>

        {highlight && (
          <Link
            href="/agenda"
            className="mt-3 flex items-center justify-between w-full px-3 py-2 rounded-xl text-xs font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 transition-colors"
          >
            Ver agenda completa
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
    </div>
  );
}

function EmptyCard({
  icon, title, sub, cta,
}: {
  icon: string;
  title: string;
  sub: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      className="rounded-2xl bg-white flex flex-col items-center justify-center py-12 px-6 text-center"
      style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.07)" }}
    >
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-black text-gray-700">{title}</p>
      <p className="text-xs text-gray-400 mt-1">{sub}</p>
      {cta && (
        <Link
          href={cta.href}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          {cta.label}
        </Link>
      )}
    </div>
  );
}
