"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Store,
  DollarSign,
  Users,
  LogOut,
  UserCheck,
  UserPlus,
  MapPin,
} from "lucide-react";
import { HeraIcon } from "@/components/brand/BrandLogo";

const NAV = [
  { href: "/master",                  label: "Dashboard",       icon: LayoutDashboard, exact: true },
  { href: "/master/saloes",           label: "Salões",          icon: Store },
  { href: "/master/financeiro",       label: "Financeiro",      icon: DollarSign },
  { href: "/master/revendedores",     label: "Revendedores",    icon: UserCheck },
  { href: "/master/indicadores",      label: "Indicadores",     icon: UserPlus },
  { href: "/master/representantes",   label: "Representantes",  icon: MapPin },
  { href: "/master/usuarios",         label: "Usuários",        icon: Users },
];

export function MasterSidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();

  return (
    <aside
      className="w-60 flex flex-col h-full"
      style={{ background: "#0e0b1a", borderRight: "1px solid rgba(255,255,255,0.07)" }}
    >
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            <HeraIcon size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-sm leading-tight">Hera</p>
            <p className="text-[10px] text-violet-400 font-semibold uppercase tracking-wider">Painel Master</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={
                active
                  ? { background: "rgba(124,58,237,0.2)", color: "#c4b5fd" }
                  : { color: "#71717a" }
              }
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-zinc-600 hover:text-zinc-400 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
    </aside>
  );
}
