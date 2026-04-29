"use client";
import { errMsg } from "@/lib/api-error";

import { useState, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShoppingCart, Plus, Minus, Trash2, QrCode, Loader2,
  CheckCircle2, Copy, Package, Scissors, Search, X,
  Zap, Banknote, CreditCard, Smartphone, RotateCcw,
} from "lucide-react";
import { formatBRL } from "@/lib/utils";

/* ─── Tipos ────────────────────────────────────────────────────────────────── */

interface Produto {
  id: string; nome: string; categoria: string | null;
  precoVenda: number | null; estoque: number; unidade: string;
}
interface Servico {
  id: string; nome: string; categoria: string | null; preco: number;
}
interface CartItem {
  tipo: "produto" | "servico"; id: string; nome: string;
  preco: number; quantidade: number;
}

type Metodo = "PIX" | "DINHEIRO" | "CARTAO_DEBITO" | "CARTAO_CREDITO";

interface VendaResult {
  metodo: Metodo;
  total: number;
  pago?: boolean;
  txid?: string;
  brCode?: string;
  qrCodeImage?: string;
  mockMode?: boolean;
}

/* ─── Polling PIX ──────────────────────────────────────────────────────────── */

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

/* ─── Constantes ───────────────────────────────────────────────────────────── */

const METODOS: { id: Metodo; label: string; icon: React.ReactNode; cor: string; gradient: string }[] = [
  { id: "PIX",           label: "PIX",     icon: <Smartphone className="w-4 h-4" />,  cor: "violet",  gradient: "linear-gradient(135deg,#7c3aed,#4f46e5)" },
  { id: "DINHEIRO",      label: "Dinheiro",icon: <Banknote className="w-4 h-4" />,    cor: "emerald", gradient: "linear-gradient(135deg,#059669,#10b981)" },
  { id: "CARTAO_DEBITO", label: "Débito",  icon: <CreditCard className="w-4 h-4" />,  cor: "blue",    gradient: "linear-gradient(135deg,#1d4ed8,#3b82f6)" },
  { id: "CARTAO_CREDITO",label: "Crédito", icon: <CreditCard className="w-4 h-4" />,  cor: "amber",   gradient: "linear-gradient(135deg,#d97706,#f59e0b)" },
];

const COBRAR_LABEL: Record<Metodo, string> = {
  PIX:            "Gerar QR Code PIX",
  DINHEIRO:       "Registrar Venda",
  CARTAO_DEBITO:  "Registrar Venda",
  CARTAO_CREDITO: "Registrar Venda",
};

const COR_METODO: Record<string, string> = {
  violet:  "bg-violet-500/10 text-violet-300 border-violet-500/40",
  emerald: "bg-emerald-500/10 text-emerald-300 border-emerald-500/40",
  blue:    "bg-blue-500/10 text-blue-300 border-blue-500/40",
  amber:   "bg-amber-500/10 text-amber-300 border-amber-500/40",
};
const COR_METODO_INACTIVE = "bg-white/[0.03] text-zinc-500 border-white/[0.06] hover:border-white/[0.12] hover:text-zinc-300";

/* ─── Componente principal ─────────────────────────────────────────────────── */

export function PDVView() {
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"produto" | "servico">("produto");
  const [categoria, setCategoria] = useState<string>("Todos");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodo, setMetodo] = useState<Metodo>("PIX");
  const [valorRecebido, setValorRecebido] = useState("");
  const [processando, setProcessando] = useState(false);
  const [venda, setVenda] = useState<VendaResult | null>(null);
  const [copiado, setCopiado] = useState(false);

  /* queries */
  const { data: produtos = [] } = useQuery<Produto[]>({
    queryKey: ["estoque-pdv"],
    queryFn: () => fetch("/api/estoque").then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    staleTime: 30_000,
  });
  const { data: servicos = [] } = useQuery<Servico[]>({
    queryKey: ["servicos-pdv"],
    queryFn: () => fetch("/api/servicos").then((r) => r.json()).then((d) => Array.isArray(d) ? d : []),
    staleTime: 30_000,
  });

  /* totais */
  const total = cart.reduce((s, i) => s + i.preco * i.quantidade, 0);
  const totalItens = cart.reduce((s, i) => s + i.quantidade, 0);

  /* categorias dinâmicas */
  const categorias = useMemo(() => {
    const src = aba === "produto"
      ? produtos.filter((p) => p.precoVenda && p.estoque > 0).map((p) => p.categoria ?? "Outros")
      : servicos.map((s) => s.categoria ?? "Outros");
    return ["Todos", ...Array.from(new Set(src))];
  }, [aba, produtos, servicos]);

  const troco = metodo === "DINHEIRO" && valorRecebido
    ? Math.max(0, parseFloat(valorRecebido.replace(",", ".")) - total)
    : null;

  /* reset categoria quando muda aba */
  const switchAba = (a: "produto" | "servico") => { setAba(a); setCategoria("Todos"); setBusca(""); };

  const selecionarMetodo = (m: Metodo) => { setMetodo(m); setValorRecebido(""); };

  /* itens filtrados */
  const itensFiltrados = useMemo(() => {
    const q = busca.toLowerCase();
    if (aba === "produto") {
      return produtos.filter((p) =>
        p.precoVenda && p.estoque > 0 &&
        (!q || p.nome.toLowerCase().includes(q)) &&
        (categoria === "Todos" || (p.categoria ?? "Outros") === categoria)
      );
    }
    return servicos.filter((s) =>
      (!q || s.nome.toLowerCase().includes(q)) &&
      (categoria === "Todos" || (s.categoria ?? "Outros") === categoria)
    );
  }, [aba, busca, categoria, produtos, servicos]);

  /* cart actions */
  const addItem = (item: Omit<CartItem, "quantidade">) => {
    setCart((prev) => {
      const ex = prev.find((c) => c.id === item.id && c.tipo === item.tipo);
      if (ex) return prev.map((c) => c.id === item.id && c.tipo === item.tipo ? { ...c, quantidade: c.quantidade + 1 } : c);
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

  /* polling PIX */
  const handlePago = useCallback(() => {
    toast.success("Pagamento confirmado!", { duration: 6000 });
    setVenda((v) => v ? { ...v, pago: true } : v);
  }, []);
  usePolling(venda?.txid ?? null, handlePago);

  /* cobrar */
  async function cobrar() {
    if (!cart.length) { toast.error("Adicione itens ao carrinho"); return; }
    setProcessando(true);
    try {
      const res = await fetch("/api/pdv/venda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itens: cart, metodo }),
      });
      const data = await res.json() as VendaResult & { error?: string };
      if (!res.ok) { toast.error(errMsg(data.error, "Erro ao processar venda")); return; }
      setVenda(data);
      if (data.pago) toast.success(`Venda de ${formatBRL(data.total)} confirmada!`);
      if (data.mockMode) toast.info("Modo simulação — PIX não será cobrado de verdade");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setProcessando(false);
    }
  }

  function novaVenda() { setCart([]); setVenda(null); setCopiado(false); setValorRecebido(""); }

  function copiar() {
    if (!venda?.brCode) return;
    navigator.clipboard.writeText(venda.brCode).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    });
  }

  const pixPago = venda?.metodo === "PIX" && venda.pago;

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className="flex gap-3 h-[calc(100vh-128px)]">

      {/* ══ CATÁLOGO ═══════════════════════════════════════════════════════════ */}
      <div className="flex-1 min-w-0 flex flex-col bg-[#0d0b18] rounded-2xl border border-white/[0.06] overflow-hidden">

        {/* Abas + busca */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-1 bg-white/[0.04] rounded-xl p-1">
            <button
              onClick={() => switchAba("produto")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 ${aba === "produto" ? "bg-violet-600 text-white shadow-lg shadow-violet-900/60" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Package className="w-3.5 h-3.5" /> Produtos
            </button>
            <button
              onClick={() => switchAba("servico")}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all duration-150 ${aba === "servico" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/60" : "text-zinc-500 hover:text-zinc-300"}`}
            >
              <Scissors className="w-3.5 h-3.5" /> Serviços
            </button>
          </div>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-9 pr-8 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-zinc-200 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/30 transition-all"
            />
            {busca && (
              <button onClick={() => setBusca("")} className="absolute right-2.5 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-zinc-600 hover:text-zinc-400" />
              </button>
            )}
          </div>
        </div>

        {/* Chips de categoria */}
        {categorias.length > 1 && (
          <div className="flex gap-1.5 px-4 py-2.5 overflow-x-auto [&::-webkit-scrollbar]:hidden border-b border-white/[0.04]">
            {categorias.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoria(cat)}
                className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all duration-150 ${categoria === cat ? (aba === "produto" ? "bg-violet-600 text-white" : "bg-emerald-600 text-white") : "bg-white/[0.04] text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.07]"}`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Grid de itens */}
        <div className="flex-1 overflow-y-auto p-4 [&::-webkit-scrollbar]:hidden">
          {itensFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-14 h-14 bg-white/[0.04] rounded-2xl flex items-center justify-center mb-3">
                <Package className="w-6 h-6 text-zinc-700" />
              </div>
              <p className="text-sm font-medium text-zinc-600">Nenhum item</p>
              {aba === "produto" && <p className="text-xs text-zinc-700 mt-1">Cadastre em Estoque</p>}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
              {aba === "produto"
                ? (itensFiltrados as Produto[]).map((p) => {
                    const qtd = cart.find((c) => c.id === p.id && c.tipo === "produto")?.quantidade;
                    return (
                      <button
                        key={p.id}
                        onClick={() => addItem({ tipo: "produto", id: p.id, nome: p.nome, preco: p.precoVenda! })}
                        className="group relative text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-violet-600/10 hover:border-violet-500/25 active:scale-[0.97] transition-all duration-150"
                      >
                        {qtd && (
                          <span className="absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">
                            {qtd}
                          </span>
                        )}
                        <div className="w-9 h-9 bg-violet-500/10 rounded-xl flex items-center justify-center mb-2.5 group-hover:bg-violet-500/20 transition-colors">
                          <Package className="w-4.5 h-4.5 text-violet-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 leading-snug line-clamp-2">{p.nome}</p>
                        {p.categoria && <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{p.categoria}</p>}
                        <p className="text-sm font-black text-violet-300 mt-2">{formatBRL(p.precoVenda!)}</p>
                        <p className="text-[10px] text-zinc-700">{p.estoque} {p.unidade}</p>
                      </button>
                    );
                  })
                : (itensFiltrados as Servico[]).map((s) => {
                    const qtd = cart.find((c) => c.id === s.id && c.tipo === "servico")?.quantidade;
                    return (
                      <button
                        key={s.id}
                        onClick={() => addItem({ tipo: "servico", id: s.id, nome: s.nome, preco: s.preco })}
                        className="group relative text-left p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-emerald-600/10 hover:border-emerald-500/25 active:scale-[0.97] transition-all duration-150"
                      >
                        {qtd && (
                          <span className="absolute top-2.5 right-2.5 min-w-[20px] h-5 px-1 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                            {qtd}
                          </span>
                        )}
                        <div className="w-9 h-9 bg-emerald-500/10 rounded-xl flex items-center justify-center mb-2.5 group-hover:bg-emerald-500/20 transition-colors">
                          <Scissors className="w-4.5 h-4.5 text-emerald-400" />
                        </div>
                        <p className="text-xs font-semibold text-zinc-200 leading-snug line-clamp-2">{s.nome}</p>
                        {s.categoria && <p className="text-[10px] text-zinc-600 mt-0.5 truncate">{s.categoria}</p>}
                        <p className="text-sm font-black text-emerald-300 mt-2">{formatBRL(s.preco)}</p>
                      </button>
                    );
                  })
              }
            </div>
          )}
        </div>
      </div>

      {/* ══ COMANDA ════════════════════════════════════════════════════════════ */}
      <div className="w-80 flex-shrink-0 flex flex-col bg-[#0d0b18] rounded-2xl border border-white/[0.06] overflow-hidden">

        {/* Header comanda */}
        <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-violet-400" />
            <span className="text-sm font-bold text-zinc-100">Comanda</span>
            {totalItens > 0 && (
              <span className="min-w-[20px] h-5 px-1 rounded-full bg-violet-600 text-white text-[10px] font-black flex items-center justify-center">
                {totalItens}
              </span>
            )}
          </div>
          {cart.length > 0 && (
            <button onClick={() => setCart([])} className="flex items-center gap-1 text-[11px] text-zinc-700 hover:text-red-400 transition-colors font-medium">
              <RotateCcw className="w-3 h-3" /> Limpar
            </button>
          )}
        </div>

        {/* Itens */}
        <div className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-10 px-4 text-center">
              <ShoppingCart className="w-10 h-10 text-zinc-800 mb-3" />
              <p className="text-sm text-zinc-600 font-medium">Comanda vazia</p>
              <p className="text-xs text-zinc-700 mt-1">Toque nos itens do catálogo</p>
            </div>
          ) : (
            <div className="py-1">
              {cart.map((item, idx) => (
                <div
                  key={`${item.tipo}-${item.id}`}
                  className={`px-4 py-3 flex items-start gap-3 ${idx < cart.length - 1 ? "border-b border-white/[0.04]" : ""}`}
                >
                  <div className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 ${item.tipo === "produto" ? "bg-violet-500/10" : "bg-emerald-500/10"}`}>
                    {item.tipo === "produto"
                      ? <Package className="w-3 h-3 text-violet-400" />
                      : <Scissors className="w-3 h-3 text-emerald-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-zinc-300 truncate">{item.nome}</p>
                    <p className="text-[11px] text-zinc-600 mt-0.5">{formatBRL(item.preco)} × {item.quantidade} = <span className="text-zinc-400 font-semibold">{formatBRL(item.preco * item.quantidade)}</span></p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => changeQty(item.id, item.tipo, -1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 bg-white/[0.04] hover:bg-red-500/15 hover:text-red-400 transition-all"
                    >
                      {item.quantidade === 1 ? <Trash2 className="w-3 h-3" /> : <Minus className="w-3 h-3" />}
                    </button>
                    <span className="w-5 text-center text-xs font-bold text-zinc-300">{item.quantidade}</span>
                    <button
                      onClick={() => changeQty(item.id, item.tipo, 1)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-zinc-600 bg-white/[0.04] hover:bg-violet-500/15 hover:text-violet-400 transition-all"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé: total + método + cobrar */}
        <div className="border-t border-white/[0.06] p-4 space-y-4">

          {/* Total */}
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Total</p>
              <p className="text-3xl font-black text-white tabular-nums leading-none mt-0.5">{formatBRL(total)}</p>
            </div>
            {cart.length > 0 && (
              <p className="text-xs text-zinc-600 mb-1">{cart.length} {cart.length === 1 ? "item" : "itens"}</p>
            )}
          </div>

          {/* Método de pagamento */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold mb-2">Pagamento</p>
            <div className="grid grid-cols-2 gap-1.5">
              {METODOS.map((m) => (
                <button
                  key={m.id}
                  onClick={() => selecionarMetodo(m.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150 ${metodo === m.id ? COR_METODO[m.cor] : COR_METODO_INACTIVE}`}
                >
                  {m.icon} {m.label}
                </button>
              ))}
            </div>
          </div>

          {/* Troco — só para Dinheiro */}
          {metodo === "DINHEIRO" && cart.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600 font-semibold">Valor recebido</p>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 font-semibold">R$</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={valorRecebido}
                  onChange={(e) => setValorRecebido(e.target.value)}
                  placeholder={total.toFixed(2)}
                  className="w-full pl-8 pr-3 py-2 text-sm bg-white/[0.04] border border-white/[0.08] rounded-xl text-zinc-200 placeholder-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/30 transition-all"
                />
              </div>
              {troco !== null && troco >= 0 && (
                <div className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold ${troco > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800/50 text-zinc-500"}`}>
                  <span>Troco</span>
                  <span>{formatBRL(troco)}</span>
                </div>
              )}
            </div>
          )}

          {/* Botão cobrar */}
          {(() => {
            const m = METODOS.find((x) => x.id === metodo)!;
            const Icon = metodo === "PIX" ? QrCode : m.id === "DINHEIRO" ? Banknote : CreditCard;
            return (
              <button
                onClick={cobrar}
                disabled={!cart.length || processando}
                className="w-full py-3.5 rounded-xl text-sm font-black text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2"
                style={cart.length ? { background: m.gradient, boxShadow: "0 8px 32px -8px rgba(0,0,0,0.4)" } : undefined}
              >
                {processando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Processando...</>
                  : <><Icon className="w-4 h-4" /> {COBRAR_LABEL[metodo]} {cart.length > 0 ? formatBRL(total) : ""}</>
                }
              </button>
            );
          })()}
        </div>
      </div>

      {/* ══ OVERLAY PIX ════════════════════════════════════════════════════════ */}
      {venda?.metodo === "PIX" && !pixPago && venda.txid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm mx-4 bg-[#0d0b18] border border-white/[0.08] rounded-2xl overflow-hidden shadow-2xl">

            {/* Header overlay */}
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Aguardando PIX</p>
                <p className="text-xl font-black text-white mt-0.5">{formatBRL(venda.total)}</p>
              </div>
              {venda.mockMode && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 px-2.5 py-1.5 rounded-full font-bold">
                  <Zap className="w-3 h-3" /> Simulação
                </span>
              )}
            </div>

            <div className="p-5 space-y-4">
              {/* QR Code */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  venda.qrCodeImage ||
                  (venda.brCode
                    ? `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(venda.brCode)}&size=300x300&margin=1`
                    : "")
                }
                alt="QR Code PIX"
                className="w-48 h-48 mx-auto rounded-xl border border-white/[0.06] bg-white"
              />

              {/* Copiar */}
              <button
                onClick={copiar}
                className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 border transition-all duration-200 ${
                  copiado
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                    : "bg-white/[0.04] text-zinc-300 border-white/[0.08] hover:bg-white/[0.07]"
                }`}
              >
                {copiado ? <><CheckCircle2 className="w-4 h-4" /> Copiado!</> : <><Copy className="w-4 h-4" /> Copiar código Pix Copia e Cola</>}
              </button>

              {/* Status */}
              <div className="flex items-center justify-center gap-2 py-1">
                <Loader2 className="w-3.5 h-3.5 text-violet-500 animate-spin" />
                <p className="text-xs text-zinc-500">Verificando pagamento a cada 3s...</p>
              </div>

              {/* Confirmação manual — quando PIX vai pra banco externo (não Efí) */}
              {venda.mockMode && (
                <button
                  onClick={() => { setVenda((v) => v ? { ...v, pago: true } : v); }}
                  className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 6px 20px -6px rgba(16,185,129,0.5)" }}
                >
                  <CheckCircle2 className="w-4 h-4" /> Confirmar Recebimento
                </button>
              )}

              <button onClick={novaVenda} className="w-full text-xs text-zinc-700 hover:text-zinc-400 transition-colors py-1">
                Cancelar e voltar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ OVERLAY CONFIRMAÇÃO ════════════════════════════════════════════════ */}
      {(venda?.pago || pixPago) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-xs mx-4 bg-[#0d0b18] border border-white/[0.08] rounded-2xl p-8 text-center shadow-2xl">
            <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-5 ring-4 ring-emerald-500/15">
              <CheckCircle2 className="w-11 h-11 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-white">Venda Confirmada!</p>
            <p className="text-emerald-400 font-bold text-lg mt-1">{formatBRL(venda!.total)}</p>
            <p className="text-xs text-zinc-600 mt-1 capitalize">
              {METODOS.find((m) => m.id === venda!.metodo)?.label ?? venda!.metodo}
            </p>
            <button
              onClick={novaVenda}
              className="mt-6 w-full py-3 rounded-xl text-sm font-black text-white transition-all"
              style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", boxShadow: "0 8px 24px -8px rgba(124,58,237,0.5)" }}
            >
              Nova Venda
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
