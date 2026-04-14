"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, CheckCircle2, Clock, Wallet, FileText } from "lucide-react";
import { formatBRL, getInitials } from "@/lib/utils";
import { HoleriteModal } from "./HoleriteModal";

export function ComissoesView() {
  const queryClient = useQueryClient();
  const [mesFilter, setMesFilter] = useState(format(new Date(), "yyyy-MM"));
  const [colabFilter, setColabFilter] = useState("");
  const [pagoFilter, setPagoFilter] = useState<"" | "false" | "true">("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [paying, setPaying] = useState(false);
  const [holeriteModal, setHoleriteModal] = useState<{ colaboradorId: string; colaboradorNome: string } | null>(null);

  const params = new URLSearchParams();
  if (mesFilter) params.set("mes", mesFilter);
  if (colabFilter) params.set("colaboradorId", colabFilter);
  if (pagoFilter) params.set("pago", pagoFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["comissoes-colab", mesFilter, colabFilter, pagoFilter],
    queryFn: () =>
      fetch(`/api/financeiro/comissoes?${params}`).then((r) => r.json()),
  });

  const comissoes: any[] = data?.comissoes ?? [];
  const totalPendente: number = data?.totalPendente ?? 0;
  const totalPago: number = data?.totalPago ?? 0;

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAllPending() {
    const pendentes = comissoes.filter((c) => !c.pago).map((c) => c.id);
    setSelected(new Set(pendentes));
  }

  async function handlePagar() {
    if (selected.size === 0) return;
    setPaying(true);
    try {
      const res = await fetch("/api/financeiro/comissoes/pagar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selected) }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao marcar como pago"); return; }
      toast.success(`${json.pagos} comissão(ões) marcadas como pagas`);
      setSelected(new Set());
      queryClient.invalidateQueries({ queryKey: ["comissoes-colab"] });
    } finally {
      setPaying(false);
    }
  }

  return (
    <>
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">A pagar</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{formatBRL(totalPendente)}</p>
              </div>
              <Clock className="w-8 h-8 text-amber-100" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 font-medium">Já pago</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatBRL(totalPago)}</p>
              </div>
              <Wallet className="w-8 h-8 text-green-100" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          type="month"
          value={mesFilter}
          onChange={(e) => setMesFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
        />
        <select
          value={pagoFilter}
          onChange={(e) => setPagoFilter(e.target.value as "" | "false" | "true")}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white"
        >
          <option value="">Todos</option>
          <option value="false">Pendentes</option>
          <option value="true">Pagos</option>
        </select>

        {selected.size > 0 && (
          <Button
            size="sm"
            onClick={handlePagar}
            disabled={paying}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {paying && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Pagar {selected.size} selecionado(s)
          </Button>
        )}

        <Button variant="outline" size="sm" onClick={selectAllPending}>
          Selecionar pendentes
        </Button>
      </div>

      {/* Holerites por profissional */}
      {comissoes.length > 0 && (() => {
        const unique = new Map<string, string>();
        comissoes.forEach((c: any) => {
          if (!unique.has(c.colaboradorId)) {
            unique.set(c.colaboradorId, c.colaborador?.user?.name ?? "?");
          }
        });
        return (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs text-gray-400 font-medium">Holerites:</span>
            {[...unique.entries()].map(([id, nome]) => (
              <button
                key={id}
                type="button"
                onClick={() => setHoleriteModal({ colaboradorId: id, colaboradorNome: nome })}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 border border-violet-200 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" />
                {nome}
              </button>
            ))}
          </div>
        );
      })()}

      {/* List */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Extrato de Comissões</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : comissoes.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">
              Nenhuma comissão encontrada
            </p>
          ) : (
            <div className="divide-y">
              {comissoes.map((c) => {
                const isSelected = selected.has(c.id);
                return (
                  <div
                    key={c.id}
                    onClick={() => !c.pago && toggleSelect(c.id)}
                    className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                      !c.pago ? "cursor-pointer hover:bg-gray-50" : ""
                    } ${isSelected ? "bg-violet-50" : ""}`}
                  >
                    {!c.pago && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelect(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-violet-600 flex-shrink-0"
                      />
                    )}
                    {c.pago && (
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    )}

                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback className="bg-violet-100 text-violet-700 text-xs font-semibold">
                        {getInitials(c.colaborador?.user?.name ?? "?")}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {c.colaborador?.user?.name ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {c.agendamento?.cliente?.user?.name ?? "Cliente"} •{" "}
                        {c.agendamento?.servicos
                          ?.map((s: any) => s.servico.nome)
                          .join(", ")}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-violet-700">
                        {formatBRL(c.valor)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {(Number(c.percentual) * 100).toFixed(0)}% •{" "}
                        {c.referencia}
                      </p>
                    </div>

                    <Badge
                      variant={c.pago ? "secondary" : "outline"}
                      className={`text-xs flex-shrink-0 ${
                        c.pago
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "border-amber-300 text-amber-600"
                      }`}
                    >
                      {c.pago ? "Pago" : "Pendente"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>

    {holeriteModal && (
      <HoleriteModal
        colaboradorId={holeriteModal.colaboradorId}
        colaboradorNome={holeriteModal.colaboradorNome}
        mes={mesFilter}
        onClose={() => setHoleriteModal(null)}
      />
    )}
    </>
  );
}
