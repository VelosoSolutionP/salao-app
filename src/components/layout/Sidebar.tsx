"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import { cn, getInitials } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  LayoutDashboard,
  CalendarDays,
  Scissors,
  Users,
  UserCheck,
  DollarSign,
  BarChart3,
  Megaphone,
  Settings,
  Bell,
  LogOut,
  Package,
  ChevronRight,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
  badge?: number;
};

const navGroups: Array<{ label?: string; items: NavItem[] }> = [
  {
    items: [
      { href: "/dashboard",    label: "Dashboard",     icon: LayoutDashboard, roles: ["OWNER", "BARBER"] },
      { href: "/agenda",       label: "Agenda",        icon: CalendarDays,    roles: ["OWNER", "BARBER"] },
      { href: "/clientes",     label: "Clientes",      icon: Users,           roles: ["OWNER", "BARBER"] },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/servicos",     label: "Serviços",      icon: Scissors,        roles: ["OWNER"] },
      { href: "/equipe",       label: "Equipe",        icon: UserCheck,       roles: ["OWNER"] },
      { href: "/estoque",      label: "Estoque",       icon: Package,         roles: ["OWNER"] },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro",   label: "Financeiro",    icon: DollarSign,      roles: ["OWNER"] },
      { href: "/relatorios",   label: "Relatórios",    icon: BarChart3,       roles: ["OWNER"] },
      { href: "/marketing",    label: "Marketing",     icon: Megaphone,       roles: ["OWNER"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/notificacoes", label: "Notificações",  icon: Bell,            roles: ["OWNER", "BARBER"] },
      { href: "/configuracoes",label: "Configurações", icon: Settings,        roles: ["OWNER"] },
    ],
  },
];

function roleLabel(role?: string): string {
  if (role === "OWNER") return "Proprietário";
  if (role === "BARBER") return "Barbeiro · Cabeleireiro";
  return "Usuário";
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "CLIENT";

  const { data: salonData } = useQuery({
    queryKey: ["salon-name"],
    queryFn: () => fetch("/api/configuracoes").then((r) => r.json()),
    staleTime: 60_000,
    enabled: role === "OWNER",
  });
  const salonName = salonData?.name ?? "Salão Pro";

  return (
    <div
      className="flex flex-col h-full select-none"
      style={{ background: "linear-gradient(160deg,#0e0b1a 0%,#0a0812 100%)" }}
    >
      {/* ── Brand ─────────────────────────────────────── */}
      <div className="px-5 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
              boxShadow: "0 0 0 1px rgba(124,58,237,.3), 0 4px 20px rgba(124,58,237,.45)",
            }}
          >
            <Scissors className="w-[18px] h-[18px] text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-white text-sm leading-tight tracking-tight truncate">
              {salonName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] text-zinc-500 font-semibold">Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ───────────────────────────────────────── */}
      <nav className="flex-1 px-3 pb-4 overflow-y-auto">
        {navGroups.map((group, gi) => {
          const visible = group.items.filter((i) => i.roles.includes(role));
          if (visible.length === 0) return null;
          return (
            <div key={gi} className={gi > 0 ? "mt-5" : ""}>
              {group.label && (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <p className="text-[9px] font-black uppercase tracking-[.18em] text-zinc-600">
                    {group.label}
                  </p>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>
              )}
              <div className="space-y-0.5">
                {visible.map((item) => {
                  const active =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 group",
                        active
                          ? "text-white"
                          : "text-zinc-500 hover:text-zinc-100 hover:bg-white/[0.05]"
                      )}
                      style={
                        active
                          ? {
                              background:
                                "linear-gradient(135deg,#6d28d9,#5b21b6)",
                              boxShadow:
                                "inset 0 1px 0 rgba(255,255,255,.1), 0 4px 16px rgba(109,40,217,.4)",
                            }
                          : {}
                      }
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          active
                            ? "text-violet-200"
                            : "text-zinc-600 group-hover:text-zinc-400"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>

                      {item.badge ? (
                        <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center flex-shrink-0">
                          {item.badge}
                        </span>
                      ) : active ? (
                        <ChevronRight className="w-3 h-3 text-violet-400/60 flex-shrink-0" />
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User ──────────────────────────────────────── */}
      <div className="px-3 pb-4 pt-2">
        <div
          className="relative rounded-xl px-3 py-2.5 flex items-center gap-3 overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.06)",
          }}
        >
          <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-violet-500/20">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback
              className="text-[11px] font-black"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
            >
              {getInitials(session?.user?.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-zinc-200 truncate leading-tight">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-zinc-600 truncate mt-0.5">
              {roleLabel(session?.user?.role)}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="p-1.5 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
