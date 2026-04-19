"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, QrCode, Loader2,
  CheckCircle2, Copy, Package, Scissors, Search, X, Zap,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

interface Produto {
  id: string;
  nome: string;
  categoria: string | null;
  precoVenda: number | null;
  estoque: number;
  unidade: string;
}

interface Servico {
  id: string;
  nome: string;
  categoria: string | null;
  preco: number;
}

interface CartItem {
  tipo: "produto" | "servico";
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

interface PixResult {
  txid: string;
  brCode: string;
  qrCodeImage?: string;
  total: number;
  mockMode: boolean;
}

function usePolling(txid: string | null, onPago: () => void) {
  const [pago, setPago] = useState(false);
  useQuery({
    queryKey: ["pdv-status", txid],
    queryFn: async () => {
      const r = await fetch(`/api/pdv/venda?txid=${txid}`);
      const d = await r.json() as { status: string };
      if (d.status === "CONCLUIDA") {
        setPago(true);
        onPago();
      }
      return d;
    },
    enabled: !!txid && !pago,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
  return pago;
}

export function PDVView() {
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"produto" | "servico">("produto");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [gerando, setGerando] = useState(false);
  const [pix, setPix] = useState<PixResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  const { data: produtos = [] } = useQuery<Produto[]>({
    queryKey: ["estoque-pdv"],
    queryFn: () => fetch("/api/estoque").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ["servicos-pdv"],
    queryFn: () => fetch("/api/servicos").then((r) => r.json()),
    staleTime: 30_000,
  });

  const total = cart.reduce((s, i) => s + i.preco * i.quantidade, 0);

  const addItem = (item: Omit<CartItem, "quantidade">) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id && c.tipo === item.tipo);
      if (existing) return prev.map((c) => c.id === item.id && c.tipo === item.tipo ? { ...c, quantidade: c.quantidade + 1 } : c);
      return [...prev, { ...item, quantidade: 1 }];
    });
  };

  const changeQty = (id: string, tipo: CartItem["tipo"], delta: number) => {
    setCart((prev) => prev.flatMap((c) => {
      if (c.id !== id || c.tipo !== tipo) return [c];
      const q = c.quantidade + delta;
      return q <= 0 ? [] : [{ ...c, quantidade: q }];
    }));
  };

  const handlePago = useCallback(() => {
    toast.success("Pagamento confirmado!", { duration: 6000 });
  }, []);

  const pago = usePolling(pix?.txid ?? null, handlePago);

  async function gerarPix() {
    if (!cart.length) { toast.error("Carrinho vazio"); return; }
    setGerando(true);
    try {
      const res = await fetch("/api/pdv/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: cart }),
      });
      const data = await res.json() as PixResult & { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Erro"); return; }
      setPix(data);
      if (data.mockMode) toast.info("Modo simulação — PIX não será cobrado de verdade");
    } catch {
      toast.error("Erro ao gerar PIX");
    } finally {
      setGerando(false);
    }
  }

  function copiarBrCode() {
    if (!pix) return;
    navigator.clipboard.writeText(pix.brCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  function novaVenda() {
    setCart([]);
    setPix(null);
    setCopiado(false);
  }

  const itensFiltrados = aba === "produto"
    ? produtos.filter((p) => p.precoVenda && p.estoque > 0 && (!busca || p.nome.toLowerCase().includes(busca.toLowerCase())))
    : servicos.filter((s) => !busca || s.nome.toLowerCase().includes(busca.toLowerCase()));

  return (
    <div className="flex gap-4 h-[calc(100vh-120px)]">

      {/* ── Catálogo ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Abas + busca */}
        <div className="px-4 pt-4 pb-3 border-b border-gray-100 space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => setAba("produto")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${aba === "produto" ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <Package className="w-3.5 h-3.5" /> Produtos
            </button>
            <button
              onClick={() => setAba("servico")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${aba === "servico" ? "bg-violet-100 text-violet-700" : "text-gray-500 hover:bg-gray-100"}`}
            >
              <Scissors className="w-3.5 h-3.5" /> Serviços
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Grid de itens */}
        <div className="flex-1 overflow-y-auto p-4">
          {itensFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-gray-400">
              <Package className="w-10 h-10 mb-2 text-gray-200" />
              <p className="text-sm font-medium">Nenhum item encontrado</p>
              {aba === "produto" && <p className="text-xs mt-1">Cadastre produtos em Estoque</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {aba === "produto"
                ? (itensFiltrados as Produto[]).map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addItem({ tipo: "produto", id: p.id, nome: p.nome, preco: p.precoVenda! })}
                    className="group text-left p-3 rounded-xl border border-gray-100 hover:border-violet-200 hover:bg-violet-50/50 transition-all"
                  >
                    <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-violet-200 transition-colors">
                      <Package className="w-4 h-4 text-violet-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{p.nome}</p>
                    {p.categoria && <p className="text-[10px] text-gray-400 mt-0.5">{p.categoria}</p>}
                    <p className="text-sm font-black text-violet-600 mt-1.5">{formatBRL(p.precoVenda!)}</p>
                    <p className="text-[10px] text-gray-400">{p.estoque} em estoque</p>
                  </button>
                ))
                : (itensFiltrados as Servico[]).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => addItem({ tipo: "servico", id: s.id, nome: s.nome, preco: s.preco })}
                    className="group text-left p-3 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/50 transition-all"
                  >
                    <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center mb-2 group-hover:bg-emerald-200 transition-colors">
                      <Scissors className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight line-clamp-2">{s.nome}</p>
                    {s.categoria && <p className="text-[10px] text-gray-400 mt-0.5">{s.categoria}</p>}
                    <p className="text-sm font-black text-emerald-600 mt-1.5">{formatBRL(s.preco)}</p>
                  </button>
                ))
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Carrinho + PIX ───────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">

        {/* Carrinho */}
        <div className="flex-1 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-bold text-gray-800">Carrinho</span>
              {cart.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">
                  {cart.reduce((s, i) => s + i.quantidade, 0)}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[11px] text-red-400 hover:text-red-600 font-medium">
                Limpar
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-8 text-gray-300">
                <ShoppingCart className="w-8 h-8 mb-2" />
                <p className="text-xs text-center">Clique nos itens<br />para adicionar</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={`${item.tipo}-${item.id}`} className="px-3 py-2.5 flex items-center gap-2">
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 ${item.tipo === "produto" ? "bg-violet-100" : "bg-emerald-100"}`}>
                      {item.tipo === "produto"
                        ? <Package className="w-3 h-3 text-violet-600" />
                        : <Scissors className="w-3 h-3 text-emerald-600" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{item.nome}</p>
                      <p className="text-[11px] text-gray-500">{formatBRL(item.preco)} × {item.quantidade}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => changeQty(item.id, item.tipo, -1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 hover:bg-red-100 hover:text-red-500 transition-colors"
                      >
                        {item.quantidade === 1 ? <Trash2 className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{item.quantidade}</span>
                      <button
                        onClick={() => changeQty(item.id, item.tipo, 1)}
                        className="w-5 h-5 rounded flex items-center justify-center bg-gray-100 hover:bg-violet-100 hover:text-violet-600 transition-colors"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + botão */}
          <div className="p-3 border-t border-gray-100 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-medium">Total</span>
              <span className="text-lg font-black text-gray-900">{formatBRL(total)}</span>
            </div>
            <button
              onClick={gerarPix}
              disabled={!cart.length || gerando}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md shadow-violet-200"
            >
              {gerando ? <Loader2 className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
              {gerando ? "Gerando..." : "Pagar com PIX"}
            </button>
          </div>
        </div>

        {/* QR Code modal inline */}
        {pix && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
            {pago ? (
              <div className="flex flex-col items-center py-4 text-center">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="font-black text-gray-900">Pago!</p>
                <p className="text-xs text-gray-500 mt-1">{formatBRL(pix.total)} recebido</p>
                <button
                  onClick={novaVenda}
                  className="mt-3 px-4 py-1.5 rounded-lg bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 transition-colors"
                >
                  Nova venda
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-violet-600" />
                    PIX {formatBRL(pix.total)}
                  </p>
                  {pix.mockMode && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full font-semibold">
                      <Zap className="w-2.5 h-2.5" /> Simulação
                    </span>
                  )}
                </div>

                {pix.qrCodeImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={pix.qrCodeImage} alt="QR Code PIX" className="w-full rounded-xl border border-gray-100" />
                ) : (
                  <div className="aspect-square bg-gray-50 rounded-xl flex items-center justify-center">
                    <QrCode className="w-16 h-16 text-gray-200" />
                  </div>
                )}

                <button
                  onClick={copiarBrCode}
                  className={`w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${copiado ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
                >
                  {copiado ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado ? "Copiado!" : "Copiar código PIX"}
                </button>

                <p className="text-[10px] text-gray-400 text-center flex items-center justify-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  Aguardando pagamento...
                </p>

                <button onClick={novaVenda} className="w-full text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                  Cancelar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
