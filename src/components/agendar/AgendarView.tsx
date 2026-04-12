"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatBRL, minutesToHuman, getInitials } from "@/lib/utils";
import {
  Check, Clock, Loader2, ChevronLeft, ChevronRight,
  Scissors, Sparkles, Calendar, User, Star,
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
    <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-center gap-3">
      {onBack && (
        <button
          onClick={onBack}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
      )}
      <div>
        <h2 className="text-base font-black text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function BottomBar({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-5 pb-5 pt-3 border-t border-gray-50">
      {children}
    </div>
  );
}

function ContinueButton({
  disabled, onClick, label = "Continuar",
}: { disabled?: boolean; onClick: () => void; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full h-12 rounded-2xl text-sm font-black flex items-center justify-center gap-2 transition-all ${
        disabled
          ? "bg-gray-100 text-gray-300 cursor-not-allowed"
          : "bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-lg shadow-violet-500/25 hover:opacity-90 active:scale-[0.98]"
      }`}
    >
      {label}
      {!disabled && <ChevronRight className="w-4 h-4" />}
    </button>
  );
}

// ─── AgendarView ─────────────────────────────────────────────────────────────

export function AgendarView({ salons }: { salons: Record<string, unknown>[] }) {
  const router = useRouter();

  // Usa o primeiro salão ativo
  const salon = salons[0] as Record<string, unknown>;

  const [step,               setStep]               = useState<Step>("servicos");
  const [selectedServicos,   setSelectedServicos]   = useState<string[]>([]);
  const [selectedColaborador,setSelectedColaborador]= useState<string | null>(null);
  const [selectedDate,       setSelectedDate]       = useState<Date | null>(null);
  const [selectedSlot,       setSelectedSlot]       = useState<string | null>(null);
  const [slots,              setSlots]              = useState<Slot[]>([]);
  const [loadingSlots,       setLoadingSlots]       = useState(false);
  const [submitting,         setSubmitting]         = useState(false);
  const [calendarMonth,      setCalendarMonth]      = useState(new Date());

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
        `/api/agendamentos/disponibilidade?colaboradorId=${selectedColaborador}&date=${format(date, "yyyy-MM-dd")}&duracao=${duracaoTotal}`
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
    if (!selectedColaborador || !selectedDate || !selectedSlot) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaboradorId: selectedColaborador,
          servicoIds:    selectedServicos,
          data:          format(selectedDate, "yyyy-MM-dd"),
          hora:          selectedSlot,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao agendar"); return; }
      toast.success("Agendamento realizado!");
      router.push("/historico");
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
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
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

        {/* ════════════ STEP 1: SERVIÇOS ════════════ */}
        {step === "servicos" && (
          <>
            <StepHeader title="Escolha os serviços" subtitle="Selecione um ou mais serviços" />
            <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto overscroll-contain">
              {categories.map((cat) => {
                const catServicos = servicos.filter((s) => (s.categoria || "Outros") === cat);
                return (
                  <div key={cat}>
                    <div className="px-5 py-2 bg-gray-50/80 sticky top-0 z-10">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{cat}</span>
                    </div>
                    {catServicos.map((s) => {
                      const sel = selectedServicos.includes(s.id as string);
                      return (
                        <button
                          key={s.id as string}
                          onClick={() => toggleServico(s.id as string)}
                          className={`w-full flex items-center gap-3.5 px-5 py-3.5 text-left transition-all active:scale-[0.99] ${sel ? "bg-violet-50" : "hover:bg-gray-50"}`}
                        >
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${
                            sel ? "bg-violet-600 shadow-md shadow-violet-400/30" : "bg-gray-100"
                          }`}>
                            <Scissors className={`w-4 h-4 ${sel ? "text-white" : "text-gray-400"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`font-bold text-sm ${sel ? "text-violet-700" : "text-gray-800"}`}>{s.nome as string}</p>
                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                              <Clock className="w-3 h-3" />{minutesToHuman(s.duracao as number)}
                            </p>
                          </div>
                          <p className={`font-black text-sm flex-shrink-0 ${sel ? "text-violet-600" : "text-gray-700"}`}>
                            {formatBRL(s.preco as number)}
                          </p>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            sel ? "bg-violet-600 border-violet-600" : "border-gray-300"
                          }`}>
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
              <div className="mx-5 my-3 flex items-center justify-between px-4 py-2.5 bg-violet-50 rounded-2xl">
                <div className="flex items-center gap-2 text-violet-700 text-sm">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">{minutesToHuman(duracaoTotal)}</span>
                  <span className="text-violet-300">·</span>
                  <span className="text-xs text-violet-500">{selectedServicos.length} serviço{selectedServicos.length > 1 ? "s" : ""}</span>
                </div>
                <span className="font-black text-violet-700">{formatBRL(totalPrice)}</span>
              </div>
            )}
            <BottomBar>
              <ContinueButton disabled={selectedServicos.length === 0} onClick={() => setStep("profissional")} />
            </BottomBar>
          </>
        )}

        {/* ════════════ STEP 2: PROFISSIONAL ════════════ */}
        {step === "profissional" && (
          <>
            <StepHeader title="Escolha o profissional" subtitle="Quem vai te atender?" onBack={() => setStep("servicos")} />

            <div className="p-4 space-y-2.5 max-h-[420px] overflow-y-auto overscroll-contain">
              {colaboradoresComFit.length === 0 ? (
                <div className="text-center py-12">
                  <User className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Nenhum profissional disponível</p>
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
                      className={`w-full flex items-center gap-3.5 p-4 rounded-2xl border-2 transition-all text-left active:scale-[0.99] ${
                        sel
                          ? "border-violet-400 bg-violet-50 shadow-md shadow-violet-100"
                          : "border-gray-100 hover:border-violet-200 hover:bg-violet-50/30"
                      }`}
                    >
                      <div className="relative flex-shrink-0">
                        <Avatar className="w-13 h-13 ring-2 ring-white shadow-md" style={{ width: 52, height: 52 }}>
                          <AvatarImage src={user.image} />
                          <AvatarFallback className={`font-black text-sm ${sel ? "bg-violet-600 text-white" : "bg-gradient-to-br from-violet-100 to-purple-200 text-violet-700"}`}>
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        {sel && (
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-violet-600 rounded-full flex items-center justify-center shadow-sm">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`font-black text-sm ${sel ? "text-violet-700" : "text-gray-800"}`}>{user.name}</p>
                          {match && (
                            <Badge className="text-[9px] px-1.5 py-0 bg-emerald-100 text-emerald-700 font-bold">
                              Especialista
                            </Badge>
                          )}
                        </div>
                        {(c.specialties as string[])?.length > 0 ? (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {(c.specialties as string[]).slice(0, 3).map((s) => (
                              <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${sel ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-500"}`}>
                                {s}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-0.5">Profissional</p>
                        )}
                      </div>
                      <Sparkles className={`w-4 h-4 flex-shrink-0 ${sel ? "text-violet-400" : "text-gray-200"}`} />
                    </button>
                  );
                })
              )}
            </div>

            <BottomBar>
              <ContinueButton disabled={!selectedColaborador} onClick={() => setStep("horario")} />
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
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <ChevronLeft className="w-4 h-4 text-gray-500" />
                </button>
                <span className="font-black text-gray-800 text-sm capitalize">
                  {format(calendarMonth, "MMMM yyyy", { locale: ptBR })}
                </span>
                <button
                  onClick={() => setCalendarMonth((m) => addMonths(m, 1))}
                  className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                >
                  <ChevronRight className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {/* Dias da semana */}
              <div className="grid grid-cols-7 mb-1">
                {["D","S","T","Q","Q","S","S"].map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-black text-gray-300 py-1">{d}</div>
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
                        ${isSel    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-110" : ""}
                        ${isTod && !isSel && !disabled ? "bg-violet-100 text-violet-700 ring-2 ring-violet-300" : ""}
                        ${!isSel && !isTod && !disabled ? "text-gray-700 hover:bg-violet-50 hover:text-violet-600" : ""}
                        ${disabled && inMonth ? "text-gray-200 cursor-not-allowed" : ""}
                      `}
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
                <div className="flex flex-col items-center justify-center py-7 text-gray-300">
                  <Calendar className="w-9 h-9 mb-2" />
                  <p className="text-xs">Selecione uma data</p>
                </div>
              ) : loadingSlots ? (
                <div className="flex items-center justify-center py-7 gap-2 text-gray-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs">Buscando horários...</span>
                </div>
              ) : slots.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-7 text-gray-300">
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
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                          <span>{group.icon}</span> {group.label}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {group.items.map((s) => (
                            <button
                              key={s.time}
                              onClick={() => setSelectedSlot(s.time)}
                              className={`px-3.5 py-2 rounded-xl text-xs font-black transition-all border ${
                                selectedSlot === s.time
                                  ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-400/30 scale-105"
                                  : "bg-white text-gray-600 border-gray-200 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50"
                              }`}
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
              <ContinueButton disabled={!selectedSlot} onClick={() => setStep("confirmacao")} />
            </BottomBar>
          </>
        )}

        {/* ════════════ STEP 4: CONFIRMAÇÃO ════════════ */}
        {step === "confirmacao" && (
          <>
            <StepHeader title="Confirmar agendamento" subtitle="Revise antes de confirmar" onBack={() => setStep("horario")} />

            <div className="p-5 space-y-3.5">
              {/* Profissional */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-violet-50 to-purple-50 rounded-2xl border border-violet-100">
                <Avatar className="w-12 h-12 ring-2 ring-white shadow-md flex-shrink-0">
                  <AvatarImage src={(colaboradorData?.user as Record<string,string>)?.image} />
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-purple-600 text-white font-black">
                    {getInitials((colaboradorData?.user as Record<string,string>)?.name ?? "")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-black text-gray-900 text-sm">{(colaboradorData?.user as Record<string,string>)?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(salon as Record<string, string>)?.name}</p>
                </div>
                <Star className="w-4 h-4 text-violet-300 ml-auto" />
              </div>

              {/* Serviços */}
              <div className="space-y-1.5">
                {selectedServicosData.map((s) => (
                  <div key={s.id as string} className="flex items-center justify-between py-2.5 px-4 bg-gray-50 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span className="text-sm text-gray-700 font-medium">{s.nome as string}</span>
                    </div>
                    <span className="text-sm font-black text-gray-800">{formatBRL(s.preco as number)}</span>
                  </div>
                ))}
              </div>

              {/* Data e Hora */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <Calendar className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400 mb-0.5">Data</p>
                  <p className="font-black text-gray-800 text-sm">
                    {selectedDate && format(selectedDate, "dd 'de' MMM", { locale: ptBR })}
                  </p>
                  <p className="text-[10px] text-gray-400 capitalize mt-0.5">
                    {selectedDate && format(selectedDate, "EEEE", { locale: ptBR })}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-3.5 text-center">
                  <Clock className="w-5 h-5 text-violet-400 mx-auto mb-1" />
                  <p className="text-[10px] text-gray-400 mb-0.5">Horário</p>
                  <p className="font-black text-gray-800 text-sm">{selectedSlot}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{minutesToHuman(duracaoTotal)}</p>
                </div>
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-5 py-4 rounded-2xl text-white"
                style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 4px 20px rgba(109,40,217,.3)" }}>
                <span className="font-semibold text-sm opacity-90">Total</span>
                <span className="text-2xl font-black">{formatBRL(totalPrice)}</span>
              </div>

              {/* PIX */}
              {(salon as Record<string,string>)?.pixKey && (
                <div className="flex items-center gap-3 p-3.5 bg-emerald-50 border border-emerald-100 rounded-2xl">
                  <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                    <span className="text-white text-[10px] font-black">PIX</span>
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-700">Pagamento via PIX disponível</p>
                    <p className="text-xs text-emerald-600 mt-0.5 font-mono">{(salon as Record<string,string>).pixKey}</p>
                  </div>
                </div>
              )}

              {/* Botão confirmar */}
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
            </div>
          </>
        )}
      </div>
    </div>
  );
}
