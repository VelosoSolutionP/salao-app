"use client";

import { useEffect, useState } from "react";
import { Download, X, Scissors, Smartphone } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallBanner() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Already installed (standalone mode)
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
      return;
    }

    // Dismissed by user before
    if (localStorage.getItem("pwa-dismissed")) {
      setDismissed(true);
      return;
    }

    // iOS detection
    const ua = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(ua) && !(window as any).MSStream;
    setIsIOS(ios);

    // Android / Chrome: capture the install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => {
      setInstalled(true);
      setPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    localStorage.setItem("pwa-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setPrompt(null);
  }

  // Nothing to show
  if (installed || dismissed || (!prompt && !isIOS)) return null;

  return (
    <>
      {/* Main banner */}
      <div
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: "linear-gradient(135deg,#1a1040,#0e0b1a)",
          border: "1px solid rgba(124,58,237,0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,.5), 0 0 0 1px rgba(124,58,237,.15)",
        }}
      >
        <div className="flex items-start gap-3 p-4">
          {/* App icon */}
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            <Scissors className="w-5 h-5 text-white" />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-white font-black text-sm leading-tight">
              Instale o app no celular
            </p>
            <p className="text-zinc-400 text-xs mt-1 leading-relaxed">
              {isIOS
                ? "Toque em  Compartilhar  e depois  Adicionar à Tela de Início"
                : "Acesse o sistema como um app — mais rápido e sem abrir o navegador"}
            </p>
          </div>

          {/* Dismiss */}
          <button
            onClick={dismiss}
            className="p-1 text-zinc-600 hover:text-zinc-400 transition-colors flex-shrink-0 -mt-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action area */}
        {!isIOS && prompt && (
          <div className="px-4 pb-4">
            <button
              onClick={install}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-black text-white transition-all"
              style={{
                background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                boxShadow: "0 4px 16px rgba(109,40,217,.4)",
              }}
            >
              <Download className="w-4 h-4" />
              Instalar agora — é grátis
            </button>
          </div>
        )}

        {/* iOS guide */}
        {isIOS && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowIOSGuide((v) => !v)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: "rgba(124,58,237,0.2)", color: "#a78bfa" }}
            >
              <Smartphone className="w-4 h-4" />
              Ver como instalar no iPhone
            </button>
          </div>
        )}
      </div>

      {/* iOS step-by-step modal */}
      {isIOS && showIOSGuide && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)" }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <p className="text-white font-black text-sm">Instalar no iPhone / iPad</p>
              <button onClick={() => setShowIOSGuide(false)} className="text-zinc-500 hover:text-zinc-300 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-5 py-5 space-y-4">
              {[
                { n: "1", icon: "⬆️", text: "Toque no botão Compartilhar (ícone de caixa com seta) na barra do Safari" },
                { n: "2", icon: "➕", text: 'Role para baixo e toque em "Adicionar à Tela de Início"' },
                { n: "3", icon: "✅", text: 'Toque em "Adicionar" no canto superior direito' },
                { n: "4", icon: "📱", text: "Pronto! O app aparece na sua tela inicial como qualquer outro app" },
              ].map((s) => (
                <div key={s.n} className="flex items-start gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 font-black text-white"
                    style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <span className="text-xl mr-2">{s.icon}</span>
                    <span className="text-zinc-300 text-sm leading-relaxed">{s.text}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => { setShowIOSGuide(false); dismiss(); }}
                className="w-full py-3 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
              >
                Entendido!
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
