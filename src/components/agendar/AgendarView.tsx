"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatBRL, minutesToHuman, getInitials } from "@/lib/utils";
import {
  Check, Clock, Loader2, ChevronLeft, ChevronRight,
  Scissors, Sparkles, Calendar, User, Star, LogIn, AlertCircle, PartyPopper, CreditCard,
} from "lucide-react";
import {
  addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, format, isBefore, isToday,
  isSameDay, startOfWeek, endOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";

// ─── Types ────────────────────────────────────────────────────────────────────

type Step = "servicos" | "profissional" | "horario" | "confirmacao";
interface Slot { time: string; available: boolean }

const STEP_ORDER: Step[] = ["servicos", "profissional", "horario", "confirmacao"];
const STEP_META = [
  { key: "servicos"     as Step, label: "Serviços",    icon: Scissors  },
  { key: "profissional" as Step, label: "Profissional", icon: User      },
  { key: "horario"      as Step, label: "Horário",     icon: Calendar  },
  { key: "confirmacao"  as Step, label: "Confirmar",   icon: Check     },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ title, subtitle, onBack }: { title: string; subtitle?: string; onBack?: () => void }) {
  return (
    <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-white/10">
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-white" />
        </button>
      )}
      <div>
        <h2 className="text-base font-black text-white">{title}</h2>
        {subtitle && <p className="text-xs text-white/60 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-5 pt-3 border-t border-white/10">
      {children}
    </div>
  );
}

function ContinueButton({
  disabled, onClick, label = "Continuar", hintLabel,
}: { disabled?: boolean; onClick: () => void; label?: string; hintLabel?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
        disabled
          ? "cursor-not-allowed border-2 border-white/15 text-white/40"
          : "bg-gradient-to-r from-pink-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:opacity-90 active:scale-[0.98]"
      }`}
      style={disabled ? { background: "rgba(255,255,255,0.05)" } : {}}
    >
      {disabled && hintLabel ? hintLabel : label}
      {!disabled && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

// ─── AgendarView ─────────────────────────────────────────────────────────────

export function AgendarView({ salons, salonId: salonIdProp }: { salons: Record<string, unknown>[]; salonId?: string }) {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();

  // Usa o primeiro salão ativo
  const salon = salons[0] as Record<string, unknown>;
  const salonId = salonIdProp ?? (salon?.id as string | undefined);

  const STORAGE_KEY = salonIdProp ? `guest-booking-${salonIdProp}` : "guest-booking";

  const [step,               setStep]               = useState<Step>("servicos");
  const [selectedServicos,   setSelectedServicos]   = useState<string[]>([]);
  const [selectedColaborador,setSelectedColaborador]= useState<string | null>(null);
  const [selectedDate,       setSelectedDate]       = useState<Date | null>(null);
  const [selectedSlot,       setSelectedSlot]       = useState<string | null>(null);
  const [slots,              setSlots]              = useState<Slot[]>([]);
  const [loadingSlots,       setLoadingSlots]       = useState(false);
  const [submitting,         setSubmitting]         = useState(false);
  const [confirmError,       setConfirmError]       = useState<string | null>(null);
  const [confirmSuccess,     setConfirmSuccess]     = useState(false);
  const [agendamentoId,      setAgendamentoId]      = useState<string | null>(null);
  const [pixLoading,         setPixLoading]         = useState(false);
  const [pixData,            setPixData]            = useState<{ brCode: string; qrCodeImage: string; value: number } | null>(null);
  const [pixCopied,          setPixCopied]          = useState(false);
  const [cartaoLoading,      setCartaoLoading]      = useState(false);
  const [cartaoLink,         setCartaoLink]         = useState<string | null>(null);
  const submittingRef = useRef(false);
  const [calendarMonth,      setCalendarMonth]      = useState(new Date());

  // Restaura estado salvo (retorno após login de visitante)
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (!saved) return;
      const state = JSON.parse(saved) as {
        step: Step; servicos: string[]; colaborador: string | null;
        date: string | null; slot: string | null;
      };
      sessionStorage.removeItem(STORAGE_KEY);
      setSelectedServicos(state.servicos ?? []);
      setSelectedColaborador(state.colaborador ?? null);
      if (state.date) setSelectedDate(new Date(state.date));
      setSelectedSlot(state.slot ?? null);
      setStep(state.step ?? "confirmacao");
    } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const servicos     = (salon?.servicos ?? []) as Record<string, unknown>[];
  const todosColabs  = (salon?.colaboradores ?? []) as Record<string, unknown>[];

  /**
   * Mostra todos os colaboradores ativos.
   * Marca como "especialista" aqueles que oferecem os serviços selecionados.
   * Bug original: filtro excluía colaboradores quando servicosOffer estava vazio.
   */
  type ColabWithFit = Record<string, unknown> & { match: boolean };
  const colaboradoresComFit: ColabWithFit[] = todosColabs.map((c) => {
    const offerIds = ((c.servicosOffer ?? []) as Array<{ servicoId: string }>).map((s) => s.servicoId);
    const match = selectedServicos.length === 0 || selectedServicos.every((sid) => offerIds.includes(sid));
    return { ...c, match };
  });

  const selectedServicosData = servicos.filter((s) => selectedServicos.includes(s.id as string));
  const duracaoTotal = selectedServicosData.reduce((a, s) => a + (s.duracao as number), 0);
  const totalPrice   = selectedServicosData.reduce((a, s) => a + Number(s.preco), 0);
  const colaboradorData = todosColabs.find((c) => c.id === selectedColaborador) as Record<string, unknown> | undefined;

  // Categorias de serviços
  const categories = [...new Set(servicos.map((s) => (s.categoria as string) || "Outros"))];

  function toggleServico(id: string) {
    setSelectedServicos((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
    // Ao mudar serviços, limpa seleções subsequentes
    setSelectedColaborador(null);
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
  }

  async function loadSlots(date: Date) {
    if (!selectedColaborador || selectedServicos.length === 0) return;
    setLoadingSlots(true);
    setSlots([]);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/agendamentos/disponibilidade?colaboradorId=${selectedColaborador}&salonId=${salon?.id as string}&date=${format(date, "yyyy-MM-dd")}&duracao=${duracaoTotal}`
      );
      const json = await res.json();
      setSlots(json.slots ?? []);
    } catch {
      toast.error("Erro ao buscar horários");
    } finally {
      setLoadingSlots(false);
    }
  }

  function selectDate(date: Date) {
    setSelectedDate(date);
    loadSlots(date);
  }

  function selectColaborador(id: string) {
    setSelectedColaborador(id);
    // Limpa data/slot ao trocar profissional
    setSelectedDate(null);
    setSelectedSlot(null);
    setSlots([]);
  }

  async function confirmar() {
    if (submittingRef.current) return; // bloqueia double-submit antes do re-render
    if (!selectedColaborador || !selectedDate || !selectedSlot) return;
    submittingRef.current = true;
    setSubmitting(true);
    setConfirmError(null);
    try {
      if (!salonId) {
        setConfirmError("Salão não identificado. Volte e tente novamente.");
        return;
      }
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          salonId,
          colaboradorId: selectedColaborador,
          servicoIds:    selectedServicos,
          data:          format(selectedDate, "yyyy-MM-dd"),
          hora:          selectedSlot,
        }),
      });
      let json: Record<string, unknown> = {};
      try { json = await res.json(); } catch { /* body empty */ }
      if (!res.ok) {
        const msg = (json.error as string) ?? `Erro ${res.status}`;
        setConfirmError(msg);
        toast.error(msg);
        return;
      }
      setAgendamentoId((json.id as string) ?? null);
      setConfirmSuccess(true);
      toast.success("Agendamento realizado!");
    } catch {
      const msg = "Erro de conexão. Tente novamente.";
      setConfirmError(msg);
      toast.error(msg);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  async function gerarPix() {
    if (!agendamentoId || pixLoading) return;
    setPixLoading(true);
    try {
      const res = await fetch("/api/pagamentos/pix", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamentoId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao gerar PIX"); return; }
      setPixData({ brCode: json.brCode, qrCodeImage: json.qrCodeImage, value: json.value });
    } catch {
      toast.error("Erro de conexão ao gerar PIX");
    } finally {
      setPixLoading(false);
    }
  }

  async function gerarCartao() {
    if (!agendamentoId || cartaoLoading) return;
    setCartaoLoading(true);
    try {
      const res = await fetch("/api/pagamentos/cartao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agendamentoId }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao gerar pagamento"); return; }
      setCartaoLink(json.link as string);
      window.open(json.link as string, "_blank", "noopener");
    } catch {
      toast.error("Erro de conexão");
    } finally {
      setCartaoLoading(false);
    }
  }

  function copiarPix() {
    if (!pixData?.brCode) return;
    navigator.clipboard.writeText(pixData.brCode).then(() => {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 3000);
    });
  }

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const calDays = eachDayOfInterval({
    start: startOfWeek(startOfMonth(calendarMonth), { weekStartsOn: 0 }),
    end:   endOfWeek(endOfMonth(calendarMonth),     { weekStartsOn: 0 }),
  });
  const availSlots   = slots.filter((s) => s.available);
  const morningSlots = availSlots.filter((s) => parseInt(s.time) < 12);
  const afternoonSlots = availSlots.filter((s) => parseInt(s.time) >= 12 && parseInt(s.time) < 18);
  const eveningSlots   = availSlots.filter((s) => parseInt(s.time) >= 18);

  const currentStepIdx = STEP_ORDER.indexOf(step);
  const progress = (currentStepIdx / (STEP_ORDER.length - 1)) * 100;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="w-full">

      {/* ── Stepper ── */}
      <div className="mb-5">
        <div className="flex items-start justify-between mb-3">
          {STEP_META.map((s, i) => {
            const done   = i < currentStepIdx;
            const active = i === currentStepIdx;
            return (
              <div key={s.key} className="flex-1 flex flex-col items-center relative">
                {/* Linha esquerda */}
                {i > 0 && (
                  <div className={`absolute left-0 right-1/2 top-4 h-0.5 transition-colors duration-500 ${done ? "bg-violet-400" : "bg-white/15"}`} />
                )}
                {/* Linha direita */}
                {i < STEP_META.length - 1 && (
                  <div className={`absolute left-1/2 right-0 top-4 h-0.5 transition-colors duration-500 ${i < currentStepIdx - 1 || done ? "bg-violet-400" : "bg-white/15"}`} />
                )}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 transition-all duration-300 ${
                  done   ? "bg-violet-500 shadow-lg shadow-violet-500/40" :
                  active ? "bg-white ring-4 ring-violet-300/40 shadow-lg" :
                           "bg-white/10"
                }`}>
                  {done
                    ? <Check className="w-3.5 h-3.5 text-white" />
                    : <s.icon className={`w-3.5 h-3.5 ${active ? "text-violet-700" : "text-white/40"}`} />
                  }
                </div>
                <span className={`text-[9px] mt-1.5 font-bold tracking-wide transition-colors ${
                  active ? "text-white" : done ? "text-violet-200" : "text-white/30"
                }`}>{s.label.toUpperCase()}</span>
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-violet-400 to-purple-300 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Card principal ── */}
      <div className="rounded-3xl overflow-hidden shadow-2xl shadow-black/40" style={{
        background: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(255,255,255,0.15)",
      }}>

        {/* ════════════ STEP 1: SERVIÇOS ════════════ */}
        {step === "servicos" && (
          <>
            <StepHeader title="Escolha os serviços" subtitle="Selecione um ou mais serviços" />
            <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto overscroll-contain scrollbar-thin">
              {categories.map((cat) => {
                const catServicos = servicos.filter((s) => (s.categoria || "Outros") === cat);
                return (
                  <div key={cat}>
                    <div className="px-5 py-2 sticky top-0 z-10" style={{ background: "rgba(0,0,0,0.2)", backdropFilter: "blur(8px)" }}>
                      <span className="text-[10px] font-black text-white/50 uppercase tracking-widest">{cat}</span>
                    </div>
                    {catServicos.map((s) => {
                      const sel = selectedServicos.includes(s.id as string);
                      return (
                        <button
                          key={s.id as string}
                          onClick={() => toggleServico(s.id as string)}
                          className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all active:scale-[0.99] ${sel ? "bg-white/15" : "hover:bg-white/8"}`}
                          style={sel ? { background: "rgba(255,255,255,0.12)" } : {}}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            sel ? "shadow-lg" : ""
                          }`} style={{ background: sel ? "linear-gradient(135deg,#f472b6,#a855f7)" : "rgba(255,255,255,0.1)" }}>
                            <Scissors className="w-4 h-4 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-white">{s.nome as string}</p>
                            <p className="text-xs text-white/50 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />{minutesToHuman(s.duracao as number)}
                            </p>
                          </div>
                          <p className="font-black text-sm flex-shrink-0 text-pink-300">
                            {formatBRL(s.preco as number)}
                          </p>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            sel ? "border-pink-400" : "border-white/30"
                          }`} style={sel ? { background: "linear-gradient(135deg,#f472b6,#a855f7)" } : {}}>
                            {sel && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Resumo flutuante */}
            {selectedServicos.length > 0 && (
              <div className="mx-5 my-3 flex items-center justify-between px-4 py-2.5 rounded-2xl" style={{ background: "rgba(244,114,182,0.15)", border: "1px solid rgba(244,114,182,0.3)" }}>
                <div className="flex items-center gap-2 text-pink-200 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">{minutesToHuman(duracaoTotal)}</span>
                  <span className="text-pink-400">·</span>
                  <span className="text-xs text-pink-300">{selectedServicos.length} serviço{selectedServicos.length > 1 ? "s" : ""}</span>
                </div>
                <span className="font-black text-pink-200">{formatBRL(totalPrice)}</span>
              </div>
            )}
            <BottomBar>
              <ContinueButton disabled={selectedServicos.length === 0} onClick={() => setStep("profissional")} hintLabel="Selecione ao menos um serviço" />
            </BottomBar>
          </>
        )}

        {/* ════════════ STEP 2: PROFISSIONAL ════════════ */}
        {step === "profissional" && (
          <>
            <StepHeader title="Escolha o profissional" subtitle="Quem vai te atender?" onBack={() => setStep("servicos")} />

            <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto overscroll-contain scrollbar-thin">
              {colaboradoresComFit.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-10 h-10 text-white/20 mx-auto mb-3" />
                  <p className="text-white/40 text-sm">Nenhum profissional disponível</p>
                </div>
              ) : (
                colaboradoresComFit.map((c) => {
                  const user = c.user as Record<string, string>;
                  const sel  = selectedColaborador === (c.id as string);
                  const match = c.match as boolean;
                  return (
                    <button
                      key={c.id as string}
                      onClick={() => selectColaborador(c.id as string)}
                      className="w-full flex items-center gap-3.5 p-4 rounded-2xl transition-all text-left active:scale-[0.99]"
                      style={sel
                        ? { background: "rgba(244,114,182,0.2)", border: "1.5px solid rgba(244,114,182,0.5)" }
                        : { background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.1)" }
                      }
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar style={{ width: 52, height: 52 }}>
                          <AvatarImage src={user.image} />
                          <AvatarFallback className="font-black text-sm text-white" style={{ background: "linear-gradient(135deg,#f472b6,#a855f7)" }}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        {sel && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg,#f472b6,#a855f7)" }}>
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-black text-sm text-white">{user.name}</p>
                          {match && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-bold bg-emerald-400/20 text-emerald-300">
                              Especialista
                            </span>
                          )}
                        </div>
                        {(c.specialties as string[])?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(c.specialties as string[]).slice(0, 3).map((s) => (
                              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-white/10 text-white/60">
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-white/40 mt-0.5">Profissional</p>
                        )}
                      </div>
                      <Sparkles className={`w-4 h-4 flex-shrink-0 ${sel ? "text-pink-300" : "text-white/20"}`} />
                    </button>
                  );
                })
              )}
            </div>

            <BottomBar>
              <ContinueButton disabled={!selectedColaborador} onClick={() => setStep("horario")} hintLabel="Selecione um profissional" />
            </BottomBar>
          </>
        )}

        {/* ════════════ STEP 3: HORÁRIO ════════════ */}
        {step === "horario" && (
          <>
            <StepHeader
              title="Data e horário"
              subtitle={`${(colaboradorData?.user as Record<string,string>)?.name ?? "Profissional"} · ${minutesToHuman(duracaoTotal)}`}
              onBack={() => setStep("profissional")}
            />

            {/* Calendário */}
            <div className="px-4 pt-4">
              <div className="flex items-center justify-between mb-3 px-1">
                <button
                  onClick={() => setCalendarMonth((m) => subMonths(m, 1))}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 text-white/70" />
                </button>
                <span className="font-black text-white text-sm capitalize">
                  {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-4 h-4 text-white/70" />
                </button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-1">
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-black text-white/30 py-1">{d}</div>
                ))}
              </div>

              {/* Grid de dias */}
              <div className="grid grid-cols-7 gap-y-1">
                {calDays.map((day) => {
                  const inMonth  = day.getMonth() === calendarMonth.getMonth();
                  const isPast   = isBefore(day, today);
                  const isTod    = isToday(day);
                  const isSel    = selectedDate ? isSameDay(day, selectedDate) : false;
                  const disabled = isPast || !inMonth;
                  return (
                    <button
                      key={day.toISOString()}
                      disabled={disabled}
                      onClick={() => selectDate(day)}
                      className={`
                        mx-auto w-9 h-9 rounded-full text-sm font-bold transition-all flex items-center justify-center
                        ${!inMonth ? "opacity-0 pointer-events-none" : ""}
                        ${isSel    ? "text-white shadow-lg shadow-violet-500/40 scale-110" : ""}
                        ${isTod && !isSel && !disabled ? "ring-2 ring-violet-400/60 text-violet-200" : ""}
                        ${!isSel && !isTod && !disabled ? "text-white/80 hover:bg-white/15 hover:text-white" : ""}
                        ${disabled && inMonth ? "text-white/15 cursor-not-allowed" : ""}
                      `}
                      style={isSel ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)" } : {}}
                    >
                      {format(day, "d")}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots de horário */}
            <div className="px-4 pb-4 mt-4 min-h-[130px]">
              {!selectedDate ? (
                <div className="flex flex-col items-center justify-center py-7 text-white/25">
                  <Calendar className="w-9 h-9 mb-2" />
                  <p className="text-xs">Selecione uma data</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-7 gap-2 text-white/40">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Buscando horários...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 text-white/25">
                  <Clock className="w-9 h-9 mb-2" />
                  <p className="text-xs text-center">Sem horários disponíveis<br />neste dia</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {[
                    { label: "Manhã",  items: morningSlots,   icon: "🌅" },
                    { label: "Tarde",  items: afternoonSlots, icon: "☀️" },
                    { label: "Noite",  items: eveningSlots,   icon: "🌙" },
                  ]
                    .filter((g) => g.items.length > 0)
                    .map((group) => (
                      <div key={group.label}>
                        <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <span>{group.icon}</span> {group.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((s) => (
                            <button
                              key={s.time}
                              onClick={() => setSelectedSlot(s.time)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                                selectedSlot === s.time
                                  ? "border-violet-400/60 shadow-md shadow-violet-500/30 scale-105 text-white"
                                  : "bg-white/8 text-white/70 border-white/15 hover:border-violet-400/50 hover:text-white hover:bg-white/15"
                              }`}
                              style={selectedSlot === s.time ? { background: "linear-gradient(135deg,#7c3aed,#a855f7)" } : {}}
                            >
                              {s.time}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <BottomBar>
              <ContinueButton disabled={!selectedSlot} onClick={() => setStep("confirmacao")} hintLabel="Selecione data e horário" />
            </BottomBar>
          </>
        )}

        {/* ════════════ STEP 4: CONFIRMAÇÃO ════════════ */}
        {step === "confirmacao" && (
          <>
            {/* Tela de sucesso */}
            {confirmSuccess ? (
              <div className="flex flex-col items-center px-5 py-8 gap-4">
                {/* Header sucesso */}
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-xl" style={{ background: "linear-gradient(135deg,#34d399,#059669)" }}>
                    <Check className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-xl font-black text-white">Agendado!</p>
                  <p className="text-sm text-white/50">
                    {selectedDate && format(selectedDate, "dd/MM/yyyy", { locale: ptBR })} às {selectedSlot} · {formatBRL(totalPrice)}
                  </p>
                </div>

                {/* PIX */}
                {!pixData ? (
                  <button
                    onClick={gerarPix}
                    disabled={pixLoading}
                    className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "linear-gradient(135deg,#34d399,#059669)", boxShadow: "0 4px 16px rgba(52,211,153,.35)", opacity: pixLoading ? 0.7 : 1 }}
                  >
                    {pixLoading ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <span className="text-white text-base font-black">PIX</span>}
                    <span className="text-white">{pixLoading ? "Gerando QR Code…" : "Pagar com PIX"}</span>
                  </button>
                ) : (
                  <div className="w-full space-y-3">
                    {/* QR Code */}
                    <div className="flex flex-col items-center gap-2 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.95)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pixData.qrCodeImage} alt="QR Code PIX" className="w-44 h-44 rounded-xl" />
                      <p className="text-gray-600 text-xs font-semibold">Escaneie com seu banco</p>
                      <p className="text-emerald-600 text-sm font-black">{formatBRL(pixData.value)}</p>
                    </div>

                    {/* Copia e cola */}
                    <button
                      onClick={copiarPix}
                      className="w-full py-3 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                      style={{ background: pixCopied ? "rgba(52,211,153,0.2)" : "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}
                    >
                      {pixCopied
                        ? <><Check className="w-4 h-4 text-emerald-400" /><span className="text-emerald-300">Código copiado!</span></>
                        : <><span className="text-white/80">Copiar código PIX</span></>
                      }
                    </button>
                  </div>
                )}

                {/* Cartão */}
                {!cartaoLink ? (
                  <button
                    onClick={gerarCartao}
                    disabled={cartaoLoading}
                    className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "rgba(255,255,255,0.1)", border: "1.5px solid rgba(255,255,255,0.2)", opacity: cartaoLoading ? 0.7 : 1 }}
                  >
                    {cartaoLoading
                      ? <><Loader2 className="w-4 h-4 animate-spin text-white/60" /><span className="text-white/70">Gerando link…</span></>
                      : <><CreditCard className="w-4 h-4 text-white/70" /><span className="text-white/80">Pagar com Cartão</span></>
                    }
                  </button>
                ) : (
                  <button
                    onClick={() => window.open(cartaoLink, "_blank", "noopener")}
                    className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{ background: "rgba(99,102,241,0.25)", border: "1.5px solid rgba(99,102,241,0.5)" }}
                  >
                    <CreditCard className="w-4 h-4 text-indigo-300" />
                    <span className="text-indigo-200">Abrir página de pagamento</span>
                  </button>
                )}

                <button
                  onClick={() => { router.push("/agendar"); router.refresh(); }}
                  className="text-white/40 text-xs font-semibold hover:text-white/70 transition-colors"
                >
                  Fazer outro agendamento
                </button>
              </div>
            ) : (
            <>
            <StepHeader title="Confirmar agendamento" subtitle="Revise antes de confirmar" onBack={() => { setConfirmError(null); setStep("horario"); }} />

            <div className="p-5 space-y-3.5">
              {/* Profissional */}
              <div className="flex items-center gap-4 p-4 rounded-2xl" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}>
                <Avatar className="w-12 h-12 ring-2 ring-white/20 shadow-md flex-shrink-0">
                  <AvatarImage src={(colaboradorData?.user as Record<string,string>)?.image} />
                  <AvatarFallback className="font-black text-white text-sm" style={{ background: "linear-gradient(135deg,#f472b6,#a855f7)" }}>
                    {getInitials((colaboradorData?.user as Record<string,string>)?.name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-black text-white text-sm">{(colaboradorData?.user as Record<string,string>)?.name}</p>
                  <p className="text-xs text-white/40 mt-0.5">{(salon as Record<string, string>)?.name}</p>
                </div>
                <Star className="w-4 h-4 text-pink-300 ml-auto" />
              </div>

              {/* Serviços */}
              <div className="space-y-1.5">
                {selectedServicosData.map((s) => (
                  <div key={s.id as string} className="flex items-center justify-between py-2.5 px-4 rounded-xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <span className="text-sm text-white/80 font-medium">{s.nome as string}</span>
                    </div>
                    <span className="text-sm font-black text-pink-300">{formatBRL(s.preco as number)}</span>
                  </div>
                ))}
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="rounded-2xl p-3.5 text-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Calendar className="w-5 h-5 text-violet-300 mx-auto mb-1" />
                  <p className="text-[10px] text-white/40 mb-0.5">Data</p>
                  <p className="font-black text-white text-sm">
                    {selectedDate && format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="text-[10px] text-white/40 capitalize mt-0.5">
                    {selectedDate && format(selectedDate, "EEEE", { locale: ptBR })}
                  </p>
                </div>
                <div className="rounded-2xl p-3.5 text-center" style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}>
                  <Clock className="w-5 h-5 text-violet-300 mx-auto mb-1" />
                  <p className="text-[10px] text-white/40 mb-0.5">Horário</p>
                  <p className="font-black text-white text-sm">{selectedSlot}</p>
                  <p className="text-[10px] text-white/40 mt-0.5">{minutesToHuman(duracaoTotal)}</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg,#f472b6,#a855f7,#7c3aed)", boxShadow: "0 4px 20px rgba(168,85,247,.35)" }}>
                <span className="font-semibold text-sm opacity-90">Total</span>
                <span className="text-2xl font-black">{formatBRL(totalPrice)}</span>
              </div>

              {/* PIX */}
              {(salon as Record<string,string>)?.pixKey && (
                <div className="flex items-center gap-3 p-3.5 rounded-2xl" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.25)" }}>
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-[10px] font-black">PIX</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-300">Pagamento via PIX disponível</p>
                    <p className="text-xs text-emerald-400/70 mt-0.5 font-mono">{(salon as Record<string,string>).pixKey}</p>
                  </div>
                </div>
              )}

              {/* Erro inline */}
              {confirmError && (
                <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.35)" }}>
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-black text-red-300">Não foi possível agendar</p>
                    <p className="text-xs text-red-400/80 mt-0.5">{confirmError}</p>
                  </div>
                </div>
              )}

              {/* Visitante: salva estado e pede login */}
              {sessionStatus === "loading" ? (
                <div className="flex items-center justify-center py-4 gap-2 text-white/50">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">Verificando sessão...</span>
                </div>
              ) : !session?.user ? (
                <div className="space-y-2.5">
                  <div className="flex items-start gap-3 p-4 rounded-2xl" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.25)" }}>
                    <LogIn className="w-5 h-5 text-amber-300 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-black text-amber-200">Faça login para confirmar</p>
                      <p className="text-xs text-amber-300/70 mt-0.5">Crie uma conta gratuita ou entre — seu agendamento será mantido.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      // Persiste o estado atual para restaurar após o login
                      try {
                        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                          step: "confirmacao",
                          servicos: selectedServicos,
                          colaborador: selectedColaborador,
                          date: selectedDate?.toISOString() ?? null,
                          slot: selectedSlot,
                        }));
                      } catch { /* ignore */ }
                      router.push("/agendar/entrar");
                    }}
                    className="w-full h-[52px] rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                    style={{
                      background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                      boxShadow: "0 4px 20px rgba(109,40,217,.35)",
                    }}
                  >
                    <LogIn className="w-4 h-4" /> Entrar para confirmar
                  </button>
                </div>
              ) : (
                /* Botão confirmar (usuário autenticado) */
                <button
                  onClick={confirmar}
                  disabled={submitting}
                  className="w-full h-13 rounded-2xl text-sm font-black text-white flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  style={{
                    height: 52,
                    background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
                    boxShadow: "0 4px 20px rgba(109,40,217,.35)",
                    opacity: submitting ? 0.7 : 1,
                  }}
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <><Check className="w-4 h-4" /> Confirmar agendamento</>
                  )}
                </button>
              )}
            </div>
            </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
