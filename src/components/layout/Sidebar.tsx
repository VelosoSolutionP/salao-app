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
  ShoppingBag,
} from "lucide-react";
import { SalonSwitcher } from "@/components/shared/SalonSwitcher";
import { PLANOS } from "@/lib/planos";

const UPGRADE_LABEL: Record<string, string> = Object.fromEntries(
  (["BASICO", "PRATA", "OURO", "PLATINA"] as const).flatMap((t) =>
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
      { href: "/servicos",      label: "Serviços",          icon: Scissors,     roles: ["OWNER", "MASTER"] },
      { href: "/equipe",        label: "Equipe",            icon: UserCheck,    roles: ["OWNER", "MASTER"] },
      { href: "/estoque",       label: "Estoque",           icon: Package,      roles: ["OWNER", "MASTER"] },
      { href: "/pdv",           label: "PDV",               icon: ShoppingBag,  roles: ["OWNER", "BARBER", "MASTER"] },
      { href: "/transformacoes",label: "Transformações",    icon: Sparkles,     roles: ["OWNER", "BARBER", "MASTER"] },
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
    <div className="flex flex-col h-full select-none">

      {/* ── Brand ───────────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-3">
          {/* Logo */}
          <div className="relative flex-shrink-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0">
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{
                  background: `#000 url('/logo.jpeg') no-repeat center top`,
                  backgroundSize: "56px auto",
                }} />
              )}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full" style={{ boxShadow: "0 0 0 2px #0f0f0f" }} />
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
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(196,163,90,.18)", color: "#c4a35a" }}>
                  Master
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Nav ─────────────────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {navGroups.map((group, gi) => {
          const visible = group.items.filter((i) => i.roles.includes(role));
          if (visible.length === 0) return null;

          return (
            <div key={gi} className={gi > 0 ? "mt-1 pt-1 border-t border-white/[0.06]" : ""}>
              <div className="space-y-0.5 py-1">
                {visible.map((item) => {
                  const locked = planoRoutes !== null && !planoRoutes.includes(item.href);

                  if (locked) {
                    return (
                      <div
                        key={item.href}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-not-allowed"
                        title={UPGRADE_LABEL[item.href] ?? "Plano superior"}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0 text-white/15" />
                        <span className="flex-1 text-sm font-medium text-white/15 truncate">{item.label}</span>
                        <Lock className="w-3 h-3 text-white/15 flex-shrink-0" />
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
                          ? "bg-white/10 text-white"
                          : "text-white/45 hover:text-white/80 hover:bg-white/[0.06]"
                      )}
                    >
                      <item.icon
                        className={cn(
                          "w-4 h-4 flex-shrink-0 transition-colors",
                          active ? "text-white" : "text-white/35 group-hover:text-white/60"
                        )}
                      />
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      {/* ── User ────────────────────────────────────────── */}
      <div className="px-2 pb-4 pt-2">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors group">
          <Avatar className="w-7 h-7 flex-shrink-0">
            <AvatarImage src={session?.user?.image ?? ""} />
            <AvatarFallback
              className="text-[10px] font-bold"
              style={{ background: "#1e1e2a", color: "#fff" }}
            >
              {getInitials(session?.user?.name ?? "U")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate leading-none">
              {session?.user?.name}
            </p>
            <p className="text-[10px] text-sidebar-foreground/50 truncate mt-0.5">
              {roleLabel(session?.user?.role)}
            </p>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            title="Sair"
            className="p-1 rounded-md text-sidebar-foreground/30 hover:text-rose-400 active:text-rose-400 transition-all flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── PWA install ─────────────────────────────────── */}
      {!pwaInstalled && installPrompt && (
        <div className="px-2 pb-3">
          <button
            onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-400 hover:bg-white/[0.04] transition-all"
          >
            <Download className="w-3.5 h-3.5 flex-shrink-0" />
            Instalar app
          </button>
        </div>
      )}
    </div>
  );
}
