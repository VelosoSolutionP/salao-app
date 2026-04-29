"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTheme } from "@/providers/ThemeContext";
import { Sidebar } from "./Sidebar";
import { Menu, Sun, Moon, AlertTriangle, ShieldAlert } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import Link from "next/link";

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="h-8 w-36" />;

  return (
    <div className="flex items-center gap-0.5 rounded-xl border border-border p-1">
      <button
        onClick={() => setTheme("light")}
        title="Tema claro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          theme === "light"
            ? "bg-foreground/10 text-foreground"
            : "text-foreground/40 hover:text-foreground/60"
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
        Claro
      </button>
      <button
        onClick={() => setTheme("dark")}
        title="Tema escuro"
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
          theme === "dark" || theme === "baiano"
            ? "bg-foreground/10 text-foreground"
            : "text-foreground/40 hover:text-foreground/60"
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
        Escuro
      </button>
    </div>
  );
}

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const role = session?.user?.role;
  const { data: configData } = useQuery({
    queryKey: ["salon-name"],
    queryFn: () => fetch("/api/configuracoes").then((r) => r.json()),
    staleTime: 60_000,
    enabled: role === "OWNER" || role === "BARBER",
  });
  const salonLogo  = configData?.logoUrl    as string | undefined;
  const salonName  = configData?.name       as string | undefined;
  const rawBrand   = configData?.brandColor as string | undefined;
  const brandColor = (!rawBrand || rawBrand === "#7c3aed") ? "#111111" : rawBrand;
  const bgColor    = configData?.bgColor     as string | undefined;

  const { data: planoData } = useQuery({
    queryKey: ["plano-atual"],
    queryFn: () => fetch("/api/plano").then((r) => r.json()),
    staleTime: 120_000,
    enabled: role === "OWNER",
  });
  const bloqueado  = planoData?.bloqueado as boolean | undefined;
  const trial      = planoData?.trial     as boolean | undefined;
  const diasTrial  = planoData?.diasTrial as number  | undefined;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: bgColor ?? "#1c1c1c" }}>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="p-0 w-60 border-transparent gap-0 bg-sidebar"
        >
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Desktop topbar */}
        <header className="hidden lg:flex items-center justify-end px-6 py-2.5" style={{ background: "#1c1c1c", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <ThemeSwitcher />
        </header>

        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-white/10"
          style={{ background: `linear-gradient(135deg, ${brandColor}dd, ${brandColor}99)` }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="text-white/80 hover:text-white p-1 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div
              className="w-7 h-7 rounded-lg overflow-hidden flex-shrink-0"
              style={salonLogo ? { border: "1px solid rgba(255,255,255,0.15)" } : undefined}
            >
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName ?? "Bellefy"} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full" style={{
                  background: "#000 url('/logo.jpeg') no-repeat center top",
                  backgroundSize: "44px auto",
                }} />
              )}
            </div>
            <span className="font-black text-white text-sm tracking-tight">
              {salonName ?? "Bellefy"}
            </span>
          </div>
        </header>

        {/* Trial / block banners */}
        {bloqueado && (
          <div className="bg-red-600 text-white px-4 py-2.5 flex items-center gap-3 text-sm">
            <ShieldAlert className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 font-medium">Acesso suspenso por inadimplência.</span>
            <Link href="/contrato" className="font-bold underline underline-offset-2 flex-shrink-0">Regularizar agora</Link>
          </div>
        )}
        {!bloqueado && trial && diasTrial !== undefined && diasTrial <= 7 && (
          <div className="bg-amber-500 text-white px-4 py-2 flex items-center gap-3 text-sm">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">Período de teste: <strong>{diasTrial} dias restantes</strong>.</span>
            <Link href="/contrato" className="font-bold underline underline-offset-2 flex-shrink-0">Assinar plano</Link>
          </div>
        )}

        <main className="flex-1 overflow-y-auto p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
