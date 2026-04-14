"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, CheckCircle, XCircle, Clock, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface UserItem {
  id: string;
  name: string;
  email: string;
  role: string;
  blocked: boolean;
  trialExpires: string | null;
  createdAt: string;
}

export function MasterUsuarios() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const { data: users = [], isLoading } = useQuery<UserItem[]>({
    queryKey: ["master-usuarios"],
    queryFn: () => fetch("/api/master/usuarios").then((r) => r.json()),
    staleTime: 30_000,
  });

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  async function toggleBlock(user: UserItem) {
    setActionId(user.id);
    try {
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, blocked: !user.blocked }),
      });
      if (!res.ok) throw new Error();
      toast.success(user.blocked ? "Acesso liberado" : "Usuário bloqueado");
      qc.invalidateQueries({ queryKey: ["master-usuarios"] });
    } catch {
      toast.error("Erro ao atualizar");
    } finally {
      setActionId(null);
    }
  }

  async function extendTrial(user: UserItem, dias: number) {
    setActionId(user.id + "-trial");
    try {
      const res = await fetch("/api/master/usuarios", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, trialExpires: addDays(new Date(), dias).toISOString() }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Trial estendido por ${dias} dias`);
      qc.invalidateQueries({ queryKey: ["master-usuarios"] });
    } catch {
      toast.error("Erro ao atualizar trial");
    } finally {
      setActionId(null);
    }
  }

  const trialStatus = (u: UserItem) => {
    if (u.blocked) return { label: "Bloqueado", color: "text-red-400", bg: "bg-red-500/20" };
    if (!u.trialExpires) return { label: "Ativo", color: "text-green-400", bg: "bg-green-500/20" };
    if (new Date(u.trialExpires) > new Date())
      return {
        label: `Trial até ${new Date(u.trialExpires).toLocaleDateString("pt-BR")}`,
        color: "text-amber-400",
        bg: "bg-amber-500/20",
      };
    return { label: "Expirado", color: "text-red-400", bg: "bg-red-500/20" };
  };

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-white">Usuários</h1>
        <p className="text-zinc-500 text-sm mt-0.5">{users.length} usuário(s) cadastrado(s)</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou e-mail..."
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white placeholder-zinc-600 outline-none focus:ring-1 focus:ring-violet-500/50"
          style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}
        />
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
        {isLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-5 h-5 text-violet-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Users className="w-8 h-8 text-zinc-700" />
            <p className="text-zinc-600 text-sm">Nenhum usuário encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((user) => {
              const status = trialStatus(user);
              return (
                <div key={user.id} className="px-4 py-4 space-y-3">
                  {/* Row 1: avatar + info */}
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{user.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-400">
                          {user.role}
                        </span>
                      </div>
                      <p className="text-zinc-600 text-xs mt-0.5 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Row 2: action buttons */}
                  <div className="flex gap-2">
                    <button
                      disabled={actionId === user.id + "-trial"}
                      onClick={() => extendTrial(user, 30)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}
                    >
                      {actionId === user.id + "-trial"
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <><Clock className="w-3 h-3" /> +30 dias</>}
                    </button>
                    <button
                      disabled={actionId === user.id}
                      onClick={() => toggleBlock(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-colors"
                      style={user.blocked
                        ? { background: "rgba(16,185,129,0.12)", color: "#10b981" }
                        : { background: "rgba(239,68,68,0.12)", color: "#ef4444" }}
                    >
                      {actionId === user.id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : user.blocked
                          ? <><CheckCircle className="w-3 h-3" /> Liberar</>
                          : <><XCircle className="w-3 h-3" /> Bloquear</>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
