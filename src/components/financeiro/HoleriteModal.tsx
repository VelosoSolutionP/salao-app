"use client";

import { useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Printer, Package, Store } from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface Props {
  colaboradorId: string;
  colaboradorNome: string;
  mes: string; // yyyy-MM
  onClose: () => void;
}

export function HoleriteModal({ colaboradorId, colaboradorNome, mes, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["holerite", colaboradorId, mes],
    queryFn: () =>
      fetch(`/api/financeiro/comissoes/holerite?colaboradorId=${colaboradorId}&mes=${mes}`)
        .then((r) => r.json()),
  });

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html><head>
        <title>Holerite — ${colaboradorNome} — ${data?.periodo}</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 13px; color: #555; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 12px; }
          th { background: #f3f4f6; text-align: left; padding: 6px 8px; font-size: 11px; }
          td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 11px; }
          .total-row td { font-weight: bold; background: #f9fafb; }
          .summary { margin-top: 20px; display: flex; gap: 24px; }
          .summary-item { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 14px; }
          .summary-item p:first-child { font-size: 10px; color: #6b7280; margin-bottom: 2px; }
          .summary-item p:last-child { font-size: 16px; font-weight: bold; }
          .green { color: #16a34a; } .amber { color: #d97706; } .violet { color: #7c3aed; }
        </style>
      </head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `);
    win.document.close();
    win.focus();
    win.print();
    win.close();
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Holerite — {colaboradorNome}</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !data || data.error ? (
          <p className="text-center text-sm text-gray-400 py-8">
            {data?.error ?? "Erro ao carregar holerite"}
          </p>
        ) : (
          <>
            <div className="flex justify-end gap-2 mb-4">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir
              </Button>
            </div>

            <div ref={printRef} className="space-y-5">
              {/* Header */}
              <div>
                <h1 className="text-lg font-black text-gray-900">{data.colaborador.nome}</h1>
                <p className="text-sm text-gray-500">{data.periodo}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {data.colaborador.email && <span>✉ {data.colaborador.email}</span>}
                  {data.colaborador.telefone && <span>📱 {data.colaborador.telefone}</span>}
                </div>
                <div className="flex gap-4 mt-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Store className="w-3 h-3" />
                    Prod. salão: <strong>{data.colaborador.comissaoSalaoProduto}%</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    <Package className="w-3 h-3" />
                    Prod. próprio: <strong>{data.colaborador.comissaoProprioProduto}%</strong>
                  </span>
                </div>
              </div>

              {/* KPI summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-black text-gray-800">{data.totalAtendimentos}</p>
                  <p className="text-xs text-gray-400">Atendimentos</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-blue-700">{formatBRL(data.totalServicos)}</p>
                  <p className="text-xs text-gray-400">Total serviços</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-green-700">{formatBRL(data.totalPago)}</p>
                  <p className="text-xs text-gray-400">Já pago</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-amber-700">{formatBRL(data.totalPendente)}</p>
                  <p className="text-xs text-gray-400">A pagar</p>
                </div>
              </div>

              {/* Appointments table */}
              {data.atendimentos.length === 0 ? (
                <p className="text-center text-sm text-gray-400 py-6">
                  Nenhum atendimento no período
                </p>
              ) : (
                <div className="rounded-xl border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Data</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500">Cliente</th>
                        <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">Serviços</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Valor</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Produto</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">%</th>
                        <th className="text-right px-3 py-2.5 text-xs font-semibold text-gray-500">Comissão</th>
                        <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.atendimentos.map((a: any, i: number) => (
                        <tr key={i} className="border-b last:border-0 hover:bg-gray-50/60">
                          <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                            {a.data} {a.horario}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-medium text-gray-800 max-w-[120px] truncate">
                            {a.cliente}
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 hidden sm:table-cell max-w-[160px] truncate">
                            {a.servicos}
                          </td>
                          <td className="px-3 py-2.5 text-xs font-semibold text-gray-800 text-right whitespace-nowrap">
                            {formatBRL(a.valorServico)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <span title={a.tipoProduto === "PROPRIO" ? "Produto próprio" : "Produto do salão"}>
                              {a.tipoProduto === "PROPRIO"
                                ? <Package className="w-3.5 h-3.5 text-violet-500 mx-auto" />
                                : <Store className="w-3.5 h-3.5 text-blue-400 mx-auto" />
                              }
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-gray-500 text-right">
                            {a.percentual.toFixed(0)}%
                          </td>
                          <td className="px-3 py-2.5 text-xs font-bold text-violet-700 text-right whitespace-nowrap">
                            {formatBRL(a.valorComissao)}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <Badge
                              variant={a.pago ? "secondary" : "outline"}
                              className={`text-[10px] ${a.pago ? "bg-green-100 text-green-700 border-green-200" : "border-amber-300 text-amber-600"}`}
                            >
                              {a.pago ? "Pago" : "Pendente"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50 font-bold">
                        <td colSpan={3} className="px-3 py-3 text-sm">TOTAL</td>
                        <td className="px-3 py-3 text-sm text-right">{formatBRL(data.totalServicos)}</td>
                        <td colSpan={2} className="px-3 py-3" />
                        <td className="px-3 py-3 text-sm text-right text-violet-700">{formatBRL(data.totalComissao)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {/* Footer note */}
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4 text-xs text-violet-700 space-y-1">
                <p className="font-bold">Resumo de pagamento</p>
                <p>
                  <Store className="w-3 h-3 inline mr-1" />
                  Produto do salão (<strong>{data.colaborador.comissaoSalaoProduto}%</strong>) ·
                  <Package className="w-3 h-3 inline mx-1" />
                  Produto próprio (<strong>{data.colaborador.comissaoProprioProduto}%</strong>)
                </p>
                <p className="text-green-700 font-semibold">Pago: {formatBRL(data.totalPago)}</p>
                {data.totalPendente > 0 && (
                  <p className="text-amber-700 font-semibold">
                    A pagar: {formatBRL(data.totalPendente)} — ao confirmar o pagamento, uma despesa será lançada automaticamente no fluxo de caixa.
                  </p>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
