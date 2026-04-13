import type { Metadata } from "next";
import { MasterSidebar } from "@/components/master/MasterSidebar";

export const metadata: Metadata = { title: "Painel Master — Veloso Solution" };

export default function MasterLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen" style={{ background: "#080714" }}>
      <MasterSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
