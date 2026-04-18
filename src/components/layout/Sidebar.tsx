"use client";

import { useEffect, useState } from "react";
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
  Sparkles,
  Star,
  Building2,
  Download,
  FileText,
  Lock,
} from "lucide-react";
import { SalonSwitcher } from "@/components/shared/SalonSwitcher";
import { BellefyIcon } from "@/components/brand/BrandLogo";
import { PLANOS } from "@/lib/planos";

const UPGRADE_LABEL: Record<string, string> = Object.fromEntries(
  (["BASICO", "PRATA", "OURO"] as const).flatMap((t) =>
    PLANOS[t].routes.map((r) => [r, `Disponível no plano ${PLANOS[t].nome}`])
  )
);

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
      { href: "/dashboard",    label: "Dashboard",          icon: LayoutDashboard, roles: ["OWNER", "BARBER", "MASTER"] },
      { href: "/agenda",       label: "Agenda",             icon: CalendarDays,    roles: ["OWNER", "BARBER", "MASTER"] },
      { href: "/clientes",     label: "Clientes",           icon: Users,           roles: ["OWNER", "BARBER", "MASTER"] },
    ],
  },
  {
    label: "Gestão",
    items: [
      { href: "/servicos",      label: "Serviços",          icon: Scissors,  roles: ["OWNER", "MASTER"] },
      { href: "/equipe",        label: "Equipe",            icon: UserCheck, roles: ["OWNER", "MASTER"] },
      { href: "/estoque",       label: "Estoque",           icon: Package,   roles: ["OWNER", "MASTER"] },
      { href: "/transformacoes",label: "Transformações",    icon: Sparkles,  roles: ["OWNER", "BARBER", "MASTER"] },
    ],
  },
  {
    label: "Financeiro",
    items: [
      { href: "/financeiro",   label: "Financeiro",         icon: DollarSign, roles: ["OWNER", "MASTER"] },
      { href: "/relatorios",   label: "Relatórios",         icon: BarChart3,  roles: ["OWNER", "MASTER"] },
      { href: "/marketing",    label: "Marketing",          icon: Megaphone,  roles: ["OWNER", "MASTER"] },
      { href: "/planos",       label: "Planos Fidelidade",  icon: Star,       roles: ["OWNER", "MASTER"] },
      { href: "/rede",         label: "Multi-Unidades",     icon: Building2,  roles: ["OWNER", "MASTER"] },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/notificacoes", label: "Notificações",       icon: Bell,     roles: ["OWNER", "BARBER", "MASTER"] },
      { href: "/configuracoes",label: "Configurações",      icon: Settings, roles: ["OWNER", "MASTER"] },
      { href: "/contrato",     label: "Contrato",           icon: FileText, roles: ["OWNER"] },
    ],
  },
];

function roleLabel(role?: string): string {
  if (role === "MASTER") return "Admin Master";
  if (role === "OWNER") return "Proprietário";
  if (role === "BARBER") return "Profissional";
  return "Usuário";
}

export function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = session?.user?.role ?? "CLIENT";

  const { data: configData } = useQuery({
    queryKey: ["salon-name"],
    queryFn: () => fetch("/api/configuracoes").then((r) => r.json()),
    staleTime: 60_000,
    enabled: role === "OWNER" || role === "BARBER",
  });
  const salonName = configData?.name ?? "Bellefy";
  const salonLogo = configData?.logoUrl as string | undefined;

  const { data: planoData } = useQuery({
    queryKey: ["plano-atual"],
    queryFn: () => fetch("/api/plano").then((r) => r.json()),
    staleTime: 60_000,
    enabled: role === "OWNER" || role === "BARBER",
  });
  const planoRoutes: string[] | null = planoData?.plano?.routes ?? null;

  const [installPrompt, setInstallPrompt] = useState<{ prompt: () => Promise<void> } | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) { setPwaInstalled(true); return; }
    const handler = (e: Event) => { e.preventDefault(); setInstallPrompt(e as any); };
    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => { setPwaInstalled(true); setInstallPrompt(null); });
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#07050f] select-none">

      {/* ── Brand ───────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative flex-shrink-0">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center overflow-hidden"
              style={
                salonLogo
                  ? {}
                  : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }
              }
            >
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
              ) : (
                <BellefyIcon size={16} className="text-white" />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-[#07050f]" />
          </div>

          {/* Name / switcher */}
          <div className="min-w-0 flex-1">
            {role === "MASTER" ? (
              <SalonSwitcher />
            ) : (
              <p className="font-bold text-white text-sm leading-none tracking-tight truncate">
                {salonName}
              </p>
            )}
            <div className="flex items-center gap-1.5 mt-1">
              {planoData?.plano && role === "OWNER" && (
                <span
                  className="text-[9px] font-black px-1.5 py-0.5 rounded"
                  style={{ background: `${planoData.plano.cor}20`, color: planoData.plano.cor }}
                >
                  {planoData.plano.nome}
                </span>
              )}
              {role === "MASTER" && (
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-400">
                  Master
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {navGroups.map((group, gi) => {
          const visible = group.items.filter((i) => i.roles.includes(role));
          if (visible.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-4" : ""}>
              {group.label && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
                  {group.label}
                </p>
              )}

              <div className="space-y-px">
                {visible.map((item) => {
                  const locked = planoRoutes !== null && !planoRoutes.includes(item.href);

                  if (locked) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-not-allowed"
                        title={UPGRADE_LABEL[item.href] ?? "Plano superior"}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0 text-zinc-800" />
                        <span className="flex-1 text-sm font-medium text-zinc-800 truncate">{item.label}</span>
                        <Lock className="w-3 h-3 text-zinc-800 flex-shrink-0" />
                      </div>
                    );
                  }

                  const active = pathname === item.href || pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-100",
                        active
                          ? "bg-violet-500/10 text-white"
                          : "text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          active ? "text-violet-400" : "text-zinc-600 group-hover:text-zinc-400"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                      {active && !item.badge && (
                        <span className="w-1 h-1 rounded-full bg-violet-400 flex-shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── PWA install ─────────────────────────────────── */}
      {!pwaInstalled && installPrompt && (
        <div className="px-2 pb-2">
          <button
            onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.04] transition-all"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            Instalar app
          </button>
        </div>
      )}

      {/* ── User ────────────────────────────────────────── */}
      <div className="px-2 pb-4 pt-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white/[0.04] transition-colors group">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback
              className="text-[10px] font-bold"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", color: "#fff" }}
            >
              {getInitials(session?.user?.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-zinc-300 truncate leading-none">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-zinc-600 truncate mt-0.5">
              {roleLabel(session?.user?.role)}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="p-1 rounded-md text-zinc-700 hover:text-rose-400 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
