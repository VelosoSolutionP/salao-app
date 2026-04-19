"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, QrCode, Loader2,
  CheckCircle2, Copy, Package, Scissors, Search, X, Zap,
  Sparkles, ArrowRight,
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
      if (d.status === "CONCLUIDA") { setPago(true); onPago(); }
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
  const totalItens = cart.reduce((s, i) => s + i.quantidade, 0);

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

      {/* ── Catálogo ──────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0d0b18] rounded-2xl border border-white/[0.06] overflow-hidden">

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-white/[0.06] space-y-4">
          {/* Tabs */}
          <div className="flex items-center gap-1 p-1 bg-white/[0.04] rounded-xl w-fit">
            <button
              onClick={() => setAba("produto")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                aba === "produto"
                  ? "bg-violet-600 text-white shadow-lg shadow-violet-900/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Produtos
            </button>
            <button
              onClick={() => setAba("servico")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
                aba === "servico"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Serviços
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar produto ou serviço..."
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-zinc-500 hover:text-zinc-300 transition-colors" />
              </button>
            )}
          </div>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden">
          {itensFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-white/[0.04] rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-7 h-7 text-zinc-700" />
              </div>
              <p className="text-sm font-medium text-zinc-500">Nenhum item encontrado</p>
              {aba === "produto" && <p className="text-xs text-zinc-700 mt-1">Cadastre produtos em Estoque</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {aba === "produto"
                ? (itensFiltrados as Produto[]).map((p) => {
                    const noCart = cart.find((c) => c.id === p.id && c.tipo === "produto");
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItem({ tipo: "produto", id: p.id, nome: p.nome, preco: p.precoVenda! })}
                        className="group relative text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-violet-600/10 hover:border-violet-500/30 transition-all duration-200"
                      >
                        {noCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">
                            {noCart.quantidade}
                          </span>
                        )}
                        <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-violet-500/20 transition-colors">
                          <Package className="w-5 h-5 text-violet-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 leading-tight line-clamp-2 mb-1">{p.nome}</p>
                        {p.categoria && <p className="text-[10px] text-zinc-600 mb-2">{p.categoria}</p>}
                        <p className="text-base font-black text-violet-400">{formatBRL(p.precoVenda!)}</p>
                        <p className="text-[10px] text-zinc-700 mt-0.5">{p.estoque} {p.unidade}</p>
                      </button>
                    );
                  })
                : (itensFiltrados as Servico[]).map((s) => {
                    const noCart = cart.find((c) => c.id === s.id && c.tipo === "servico");
                    return (
                      <button
                        key={s.id}
                        onClick={() => addItem({ tipo: "servico", id: s.id, nome: s.nome, preco: s.preco })}
                        className="group relative text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.03] hover:bg-emerald-600/10 hover:border-emerald-500/30 transition-all duration-200"
                      >
                        {noCart && (
                          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                            {noCart.quantidade}
                          </span>
                        )}
                        <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-500/20 transition-colors">
                          <Scissors className="w-5 h-5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 leading-tight line-clamp-2 mb-1">{s.nome}</p>
                        {s.categoria && <p className="text-[10px] text-zinc-600 mb-2">{s.categoria}</p>}
                        <p className="text-base font-black text-emerald-400">{formatBRL(s.preco)}</p>
                      </button>
                    );
                  })
              }
            </div>
          )}
        </div>
      </div>

      {/* ── Carrinho + PIX ────────────────────────────────────────────────── */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">

        {/* Carrinho */}
        <div className="flex-1 bg-[#0d0b18] rounded-2xl border border-white/[0.06] overflow-hidden flex flex-col">

          {/* Cart header */}
          <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 bg-violet-500/10 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-sm font-bold text-zinc-200">Carrinho</span>
              {totalItens > 0 && (
                <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">
                  {totalItens}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[11px] text-zinc-600 hover:text-red-400 font-medium transition-colors">
                Limpar
              </button>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-center px-4">
                <div className="w-12 h-12 bg-white/[0.04] rounded-xl flex items-center justify-center mb-3">
                  <ShoppingCart className="w-5 h-5 text-zinc-700" />
                </div>
                <p className="text-xs text-zinc-600 leading-relaxed">Clique nos produtos<br />para adicionar</p>
              </div>
            ) : (
              <div className="divide-y divide-white/[0.04] py-1">
                {cart.map((item) => (
                  <div key={`${item.tipo}-${item.id}`} className="px-4 py-3 flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      item.tipo === "produto" ? "bg-violet-500/10" : "bg-emerald-500/10"
                    }`}>
                      {item.tipo === "produto"
                        ? <Package className="w-3.5 h-3.5 text-violet-400" />
                        : <Scissors className="w-3.5 h-3.5 text-emerald-400" />
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-zinc-300 truncate">{item.nome}</p>
                      <p className="text-[11px] text-zinc-600 mt-0.5">{formatBRL(item.preco * item.quantidade)}</p>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => changeQty(item.id, item.tipo, -1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-red-500/20 hover:text-red-400 text-zinc-500 transition-all"
                      >
                        {item.quantidade === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                      </button>
                      <span className="w-5 text-center text-xs font-bold text-zinc-300">{item.quantidade}</span>
                      <button
                        onClick={() => changeQty(item.id, item.tipo, 1)}
                        className="w-6 h-6 rounded-lg flex items-center justify-center bg-white/[0.05] hover:bg-violet-500/20 hover:text-violet-400 text-zinc-500 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total + botão */}
          <div className="p-4 border-t border-white/[0.06] space-y-4">
            <div className="flex items-end justify-between">
              <span className="text-xs text-zinc-600 font-medium uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-white tabular-nums">{formatBRL(total)}</span>
            </div>
            <button
              onClick={gerarPix}
              disabled={!cart.length || gerando}
              className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: cart.length
                  ? "linear-gradient(135deg, #7c3aed, #4f46e5)"
                  : undefined,
                boxShadow: cart.length ? "0 8px 32px -8px rgba(124,58,237,0.6)" : undefined,
              }}
            >
              {gerando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando...</>
                : <><QrCode className="w-4 h-4" /> Cobrar com PIX <ArrowRight className="w-3.5 h-3.5" /></>
              }
            </button>
          </div>
        </div>

        {/* QR Code */}
        {pix && (
          <div className="bg-[#0d0b18] rounded-2xl border border-white/[0.06] overflow-hidden">
            {pago ? (
              /* ── Pago ── */
              <div className="flex flex-col items-center py-8 text-center px-4">
                <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mb-4 ring-4 ring-emerald-500/20">
                  <CheckCircle2 className="w-9 h-9 text-emerald-400" />
                </div>
                <p className="text-lg font-black text-white">Recebido!</p>
                <p className="text-sm text-emerald-400 font-bold mt-1">{formatBRL(pix.total)}</p>
                <p className="text-xs text-zinc-600 mt-1">pagamento confirmado</p>
                <button
                  onClick={novaVenda}
                  className="mt-5 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all"
                  style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)" }}
                >
                  Nova venda
                </button>
              </div>
            ) : (
              /* ── Aguardando ── */
              <>
                <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-violet-400" />
                    <span className="text-sm font-bold text-zinc-200">{formatBRL(pix.total)}</span>
                  </div>
                  {pix.mockMode && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full font-bold">
                      <Zap className="w-2.5 h-2.5" /> Simulação
                    </span>
                  )}
                </div>

                <div className="p-4 space-y-3">
                  {pix.qrCodeImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pix.qrCodeImage}
                      alt="QR Code PIX"
                      className="w-full rounded-xl border border-white/[0.06]"
                    />
                  ) : (
                    <div className="aspect-square bg-white/[0.03] rounded-xl flex flex-col items-center justify-center gap-2">
                      <QrCode className="w-14 h-14 text-zinc-800" />
                      <p className="text-[10px] text-zinc-700">QR Code indisponível</p>
                    </div>
                  )}

                  <button
                    onClick={copiarBrCode}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all duration-200 ${
                      copiado
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-white/[0.05] text-zinc-400 hover:bg-white/[0.08] hover:text-zinc-200 border border-transparent"
                    }`}
                  >
                    {copiado
                      ? <><CheckCircle2 className="w-3.5 h-3.5" /> Copiado!</>
                      : <><Copy className="w-3.5 h-3.5" /> Copiar código PIX</>
                    }
                  </button>

                  <div className="flex items-center justify-center gap-1.5">
                    <Loader2 className="w-3 h-3 text-violet-500 animate-spin" />
                    <p className="text-[11px] text-zinc-600">Aguardando pagamento...</p>
                  </div>

                  <button onClick={novaVenda} className="w-full text-[11px] text-zinc-700 hover:text-zinc-500 transition-colors">
                    Cancelar
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Dica quando carrinho vazio */}
        {!pix && cart.length === 0 && (
          <div className="bg-violet-600/5 border border-violet-500/10 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-zinc-600 leading-relaxed">
              Selecione produtos ou serviços e gere um PIX na hora para o cliente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
