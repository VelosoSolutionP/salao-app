"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useTheme } from "@/providers/ThemeContext";
import { Sidebar } from "./Sidebar";
import { Menu, Sun, Moon } from "lucide-react";
import { BellefyIcon } from "@/components/brand/BrandLogo";
import { Sheet, SheetContent } from "@/components/ui/sheet";

function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { id: "light",  label: "Claro",   icon: <Sun  className="w-3.5 h-3.5" /> },
    { id: "dark",   label: "Escuro",  icon: <Moon className="w-3.5 h-3.5" /> },
    { id: "baiano", label: "🌴 Baiano", icon: null },
  ] as const;

  if (!mounted) return <div className="h-8 w-52" />;

  return (
    <div className="flex items-center gap-0.5 bg-foreground/5 rounded-xl p-1">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => setTheme(o.id)}
          title={o.label}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-150 ${
            theme === o.id
              ? "bg-background shadow-sm text-foreground"
              : "text-foreground/40 hover:text-foreground/70"
          }`}
        >
          {o.icon}
          {o.label}
        </button>
      ))}
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
  const brandColor = (configData?.brandColor as string | undefined) ?? "#7c3aed";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
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
        <header className="hidden lg:flex items-center justify-end px-6 py-2.5 border-b border-border bg-background/80 backdrop-blur-sm">
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
              className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
              style={
                salonLogo
                  ? { border: "1px solid rgba(255,255,255,0.15)" }
                  : { background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 2px 12px rgba(124,58,237,0.45)" }
              }
            >
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName ?? "Bellefy"} className="w-full h-full object-cover" />
              ) : (
                <BellefyIcon size={14} className="text-white" />
              )}
            </div>
            <span className="font-black text-white text-sm tracking-tight">
              {salonName ?? "Bellefy"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-7 bg-background">{children}</main>
      </div>
    </div>
  );
}
