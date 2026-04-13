"use client";

import { useState } from "react";
import { MasterSidebar } from "@/components/master/MasterSidebar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Menu, Scissors } from "lucide-react";

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "#080714" }}>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-shrink-0 shadow-2xl shadow-black/30">
        <MasterSidebar />
      </aside>

      {/* Mobile sidebar (Sheet) */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-60 border-0">
          <MasterSidebar onClose={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Mobile topbar */}
        <header
          className="lg:hidden flex items-center gap-3 px-4 py-3.5 border-b border-white/5 flex-shrink-0"
          style={{ background: "#0e0b1a" }}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="text-zinc-500 hover:text-zinc-200 p-1 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
            >
              <Scissors className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="font-black text-white text-sm tracking-tight">Veloso Solution</span>
              <span className="text-[10px] text-violet-400 font-semibold ml-2">Master</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
