"use client";

import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { ChevronDown, Plus, Check, Loader2, Scissors } from "lucide-react";
import { toast } from "sonner";

interface SalonItem {
  id: string;
  name: string;
  slug: string;
  active: boolean;
}

function readActiveSalonCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.split(";").find((c) => c.trim().startsWith("active_salon_id="));
  return match ? match.trim().split("=")[1] : null;
}

export function SalonSwitcher() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [activeSalonId, setActiveSalonId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const qc = useQueryClient();

  useEffect(() => {
    setActiveSalonId(readActiveSalonCookie());
  }, []);

  const { data: salons = [] } = useQuery<SalonItem[]>({
    queryKey: ["my-salons"],
    queryFn: () => fetch("/api/saloes").then((r) => r.json()),
    enabled: session?.user?.role === "OWNER",
    staleTime: 60_000,
  });

  const activeSalon = salons.find((s) => s.id === activeSalonId) ?? salons[0];
  const displayName = activeSalon?.name ?? "Salão Pro";

  // Single salon — just show name
  if (session?.user?.role !== "OWNER" || salons.length <= 1) {
    return (
      <p className="font-black text-white text-sm leading-tight tracking-tight truncate">
        {displayName}
      </p>
    );
  }

  async function switchTo(salonId: string) {
    setSwitching(true);
    try {
      const res = await fetch("/api/saloes/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ salonId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setActiveSalonId(salonId);
      setOpen(false);
      toast.success(`Trocado para: ${data.name}`);
      qc.invalidateQueries();
      window.location.reload();
    } catch {
      toast.error("Erro ao trocar de salão");
    } finally {
      setSwitching(false);
    }
  }

  async function createSalon() {
    if (!newName.trim()) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/saloes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro");
      await qc.invalidateQueries({ queryKey: ["my-salons"] });
      await switchTo(data.id);
      setCreating(false);
      setNewName("");
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao criar salão");
    } finally {
      setSwitching(false);
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen((v) => !v); setCreating(false); }}
        className="flex items-center gap-1.5 group w-full"
      >
        <p className="font-black text-white text-sm leading-tight tracking-tight truncate flex-1 text-left">
          {displayName}
        </p>
        <ChevronDown
          className={`w-3 h-3 text-zinc-500 group-hover:text-zinc-300 transition-all flex-shrink-0 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          <div
            className="absolute left-0 top-full mt-2 w-56 rounded-xl shadow-2xl z-50 overflow-hidden"
            style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <p className="px-3 py-2 text-[9px] font-black uppercase tracking-widest text-zinc-600">
              Seus Salões
            </p>

            {salons.map((s) => {
              const isActive = activeSalonId ? s.id === activeSalonId : s === salons[0];
              return (
                <button
                  key={s.id}
                  onClick={() => !isActive && switchTo(s.id)}
                  disabled={switching || isActive}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors disabled:cursor-default"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
                    style={{ background: isActive ? "linear-gradient(135deg,#7c3aed,#4f46e5)" : "rgba(255,255,255,0.08)" }}
                  >
                    {s.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-xs font-semibold flex-1 truncate ${isActive ? "text-white" : "text-zinc-400"}`}>
                    {s.name}
                  </span>
                  {isActive && <Check className="w-3 h-3 text-violet-400 flex-shrink-0" />}
                  {switching && !isActive && <Loader2 className="w-3 h-3 text-zinc-600 animate-spin flex-shrink-0" />}
                </button>
              );
            })}

            <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }} className="mt-1">
              {creating ? (
                <div className="px-3 py-2.5 space-y-2">
                  <input
                    autoFocus
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") createSalon(); if (e.key === "Escape") setCreating(false); }}
                    placeholder="Nome do novo salão"
                    className="w-full text-xs bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-white placeholder-zinc-600 outline-none focus:border-violet-500/50"
                  />
                  <div className="flex gap-1.5">
                    <button
                      onClick={createSalon}
                      disabled={!newName.trim() || switching}
                      className="flex-1 text-[11px] font-bold py-1.5 rounded-lg bg-violet-600 text-white disabled:opacity-50 hover:bg-violet-500 transition-colors"
                    >
                      {switching ? <Loader2 className="w-3 h-3 animate-spin mx-auto" /> : "Criar"}
                    </button>
                    <button
                      onClick={() => { setCreating(false); setNewName(""); }}
                      className="flex-1 text-[11px] font-bold py-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-white/5 transition-colors"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center"
                    style={{ border: "1px dashed rgba(255,255,255,0.15)" }}
                  >
                    <Plus className="w-3.5 h-3.5 text-zinc-600" />
                  </div>
                  <span className="text-xs font-semibold text-zinc-500">Novo salão</span>
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
