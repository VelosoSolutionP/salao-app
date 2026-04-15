"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { Sidebar } from "./Sidebar";
import { Menu } from "lucide-react";
import { HeraIcon } from "@/components/brand/BrandLogo";
import { Sheet, SheetContent } from "@/components/ui/sheet";

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
  const salonLogo = configData?.logoUrl as string | undefined;
  const salonName = configData?.name as string | undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f4f3f8]">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 shadow-2xl shadow-black/30">
        <Sidebar />
      </aside>

      {/* Mobile sidebar */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-0">
          <Sidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-white/5"
          style={{ background: "linear-gradient(135deg, #0c0c14, #09090f)" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center overflow-hidden"
              style={
                salonLogo
                  ? { border: "1px solid rgba(255,255,255,0.15)" }
                  : {
                      background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                      boxShadow: "0 2px 12px rgba(124,58,237,0.45)",
                    }
              }
            >
              {salonLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={salonLogo} alt={salonName ?? "Hera"} className="w-full h-full object-cover" />
              ) : (
                <HeraIcon size={14} className="text-white" />
              )}
            </div>
            <span className="font-black text-white text-sm tracking-tight">
              {salonName ?? "Hera"}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-5 lg:p-7 bg-[#f4f3f8]">{children}</main>
      </div>
    </div>
  );
}
