"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { Loader2, Clock, User, Search, CalendarDays, FileText, X } from "lucide-react";
import { formatBRL, minutesToHuman } from "@/lib/utils";

interface Props {
  open: boolean;
  initialSlot?: { date: string; time: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-indigo-600",
  "from-emerald-500 to-teal-600",
  "from-rose-500 to-pink-600",
  "from-amber-500 to-orange-600",
  "from-cyan-500 to-sky-600",
];

function nameGradient(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
}

function getDefaultDate(override?: string | null): string {
  if (override) return override;
  const d = new Date();
  const day = d.getDay();
  if (day === 0) d.setDate(d.getDate() + 1);
  else if (day === 6) d.setDate(d.getDate() + 2);
  return format(d, "yyyy-MM-dd");
}

export function NovoAgendamentoModal({
  open,
  initialSlot,
  onClose,
  onSuccess,
}: Props) {
  /* ── picker state (all useState — no RHF in portal) ── */
  const [colaboradorId, setColaboradorId] = useState("");
  const [servicoIds, setServicoIds] = useState<string[]>([]);
  const [data, setData] = useState(() => getDefaultDate(initialSlot?.date));
  const [hora, setHora] = useState(initialSlot?.time ?? "");
  const [clienteId, setClienteId] = useState("");
  const [clienteNome, setClienteNome] = useState("");
  const [observacoes, setObservacoes] = useState("");

  /* ── UI state ── */
  const [clienteSearch, setClienteSearch] = useState("");
  const [colabSearch, setColabSearch] = useState("");
  const [servicoSearch, setServicoSearch] = useState("");
  const [slots, setSlots] = useState<{ time: string; available: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  /* ── queries ── */
  const { data: colaboradores, isLoading: loadingColabs, isError: colabsError, refetch: refetchColabs } = useQuery({
    queryKey: ["colaboradores"],
    queryFn: async () => {
      const r = await fetch("/api/colaboradores");
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 0,
  });

  const { data: servicos, refetch: refetchServicos } = useQuery({
    queryKey: ["servicos"],
    queryFn: () => fetch("/api/servicos").then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
    staleTime: 0,
  });

  const { data: clientesData } = useQuery({
    queryKey: ["clientes-search"],
    queryFn: () => fetch("/api/clientes?limit=100").then((r) => r.json()).then((d) => Array.isArray(d) ? d : (d ?? [])),
  });

  /* ── force-refetch when dialog opens ── */
  useEffect(() => {
    if (open) {
      refetchColabs();
      refetchServicos();
    }
  }, [open]); // eslint-disable-line

  /* ── derived values ── */
  const selectedColaborador = (Array.isArray(colaboradores) ? colaboradores : []).find(
    (c: any) => c.id === colaboradorId
  );

  // Show all services when no professional is selected; filter to their offers when one is selected
  const allServicos: any[] = Array.isArray(servicos) ? servicos : [];
  const displayedServicos: any[] =
    colaboradorId && (selectedColaborador?.servicosOffer?.length ?? 0) > 0
      ? selectedColaborador.servicosOffer.map((so: any) => so.servico)
      : allServicos;

  const filteredServicos = servicoSearch.trim()
    ? displayedServicos.filter((s: any) =>
        s.nome.toLowerCase().includes(servicoSearch.toLowerCase())
      )
    : displayedServicos;

  const duracaoTotal = displayedServicos
    .filter((s: any) => servicoIds.includes(s.id))
    .reduce((acc: number, s: any) => acc + Number(s.duracao), 0);

  const totalPrice = displayedServicos
    .filter((s: any) => servicoIds.includes(s.id))
    .reduce((acc: number, s: any) => acc + Number(s.preco), 0);

  const filteredClientes = (clientesData?.clientes ?? []).filter((c: any) => {
    if (!clienteSearch) return true;
    const q = clienteSearch.toLowerCase();
    return (
      c.user.name?.toLowerCase().includes(q) ||
      c.user.phone?.includes(q) ||
      c.user.email?.toLowerCase().includes(q)
    );
  });

  const selectedCliente = (clientesData?.clientes ?? []).find(
    (c: any) => c.id === clienteId
  );

  /* ── load slots when professional or date changes ── */
  useEffect(() => {
    if (!colaboradorId || !data) {
      setSlots([]);
      setSlotsMessage(null);
      setHora("");
      return;
    }
    const duracao = duracaoTotal > 0 ? duracaoTotal : 30;
    let cancelled = false;
    setLoadingSlots(true);
    setHora("");
    fetch(
      `/api/agendamentos/disponibilidade?colaboradorId=${colaboradorId}&date=${data}&duracao=${duracao}`
    )
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setSlots(json.slots ?? []);
          setSlotsMessage(json.message ?? null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSlots([]);
          setSlotsMessage(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [colaboradorId, data, duracaoTotal]); // eslint-disable-line

  /* ── slot groups ── */
  const morning = slots.filter((s) => parseInt(s.time) < 12);
  const afternoon = slots.filter((s) => {
    const h = parseInt(s.time);
    return h >= 12 && h < 18;
  });
  const evening = slots.filter((s) => parseInt(s.time) >= 18);

  /* ── helpers ── */
  function handleColaboradorSelect(id: string) {
    setColaboradorId(id);
    setColabSearch("");
    setServicoIds([]);
    setServicoSearch("");
    setSlots([]);
    setHora("");
    setSlotsMessage(null);
  }

  function toggleServico(id: string) {
    setServicoIds((cur) =>
      cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]
    );
    setFieldErrors((e) => ({ ...e, servicoIds: "" }));
  }

  function resetForm() {
    setColaboradorId("");
    setColabSearch("");
    setServicoIds([]);
    setData(getDefaultDate());
    setHora("");
    setClienteId("");
    setClienteNome("");
    setObservacoes("");
    setClienteSearch("");
    setServicoSearch("");
    setSlots([]);
    setSlotsMessage(null);
    setFieldErrors({});
  }

  async function handleSubmit() {
    const errs: Record<string, string> = {};
    if (!colaboradorId) errs.colaboradorId = "Selecione o profissional";
    if (servicoIds.length === 0) errs.servicoIds = "Selecione ao menos um serviço";
    if (!data) errs.data = "Selecione a data";
    if (!hora) errs.hora = "Selecione o horário";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/agendamentos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          colaboradorId,
          servicoIds,
          data,
          hora,
          clienteId: clienteId || undefined,
          clienteNome: clienteNome || undefined,
          observacoes: observacoes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Erro ao criar agendamento");
        return;
      }
      toast.success("Agendamento criado!");
      onSuccess();
      onClose();
      resetForm();
    } catch {
      toast.error("Erro ao criar agendamento");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── slot grid ── */
  function SlotGroup({
    label,
    emoji,
    items,
  }: {
    label: string;
    emoji: string;
    items: typeof slots;
  }) {
    if (items.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 mb-1.5">
          {emoji} {label}
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {items.map((s) => (
            <button
              key={s.time}
              type="button"
              disabled={!s.available}
              onClick={() => {
                setHora(s.time);
                setFieldErrors((e) => ({ ...e, hora: "" }));
              }}
              className={`py-1.5 text-sm rounded-xl border-2 font-semibold transition-all ${
                hora === s.time
                  ? "bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-200"
                  : s.available
                  ? "border-gray-100 text-gray-700 hover:bg-violet-50 hover:border-violet-300 cursor-pointer"
                  : "opacity-35 cursor-not-allowed bg-gray-50 text-gray-400 border-gray-100"
              }`}
            >
              {s.time}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      {/* modal */}
      <div className="relative z-10 w-full max-w-lg max-h-[90vh] flex flex-col rounded-xl overflow-hidden bg-white shadow-2xl">

        {/* ── Gradient header ── */}
        <div
          className="flex-shrink-0 px-6 py-5 flex items-center justify-between"
          style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
        >
          <div>
            <h2 className="text-lg font-bold text-white">Novo Agendamento</h2>
            <p className="text-violet-200 text-sm mt-0.5">
              Preencha os detalhes abaixo
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/15 hover:bg-white/25 transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Cliente */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <User className="w-3.5 h-3.5" /> Cliente
            </label>

            {selectedCliente ? (
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${nameGradient(
                    selectedCliente.user.name
                  )} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {initials(selectedCliente.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {selectedCliente.user.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {selectedCliente.user.phone ?? selectedCliente.user.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setClienteId("");
                    setClienteNome("");
                    setClienteSearch("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar por nome, telefone ou email..."
                    value={clienteSearch}
                    onChange={(e) => setClienteSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
                  />
                </div>
                {clienteSearch && (
                  <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-xl divide-y divide-gray-50 shadow-sm bg-white">
                    {filteredClientes.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-3">
                        Nenhum cliente encontrado
                      </p>
                    ) : (
                      filteredClientes.slice(0, 8).map((c: any) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setClienteId(c.id);
                            setClienteNome(c.user.name);
                            setClienteSearch("");
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 transition-colors text-left"
                        >
                          <div
                            className={`w-8 h-8 rounded-full bg-gradient-to-br ${nameGradient(
                              c.user.name
                            )} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}
                          >
                            {initials(c.user.name)}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-sm text-gray-900 truncate">
                              {c.user.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {c.user.phone ?? c.user.email}
                            </p>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Profissional */}
          <section>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              ✂️ Profissional
            </label>

            {selectedColaborador ? (
              /* selecionado: mostra card + botão limpar */
              <div className="flex items-center gap-3 p-3 bg-violet-50 border border-violet-200 rounded-xl">
                <div
                  className={`w-9 h-9 rounded-full bg-gradient-to-br ${nameGradient(
                    selectedColaborador.user.name
                  )} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                >
                  {initials(selectedColaborador.user.name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {selectedColaborador.user.name}
                  </p>
                  {selectedColaborador.user.phone && (
                    <p className="text-xs text-gray-500">{selectedColaborador.user.phone}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setColaboradorId("");
                    setColabSearch("");
                    setServicoIds([]);
                    setSlots([]);
                    setHora("");
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              /* não selecionado: busca + lista */
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar profissional..."
                    value={colabSearch}
                    onChange={(e) => setColabSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
                  />
                </div>

                {loadingColabs ? (
                  <div className="flex items-center gap-2 py-3 px-3">
                    <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                    <span className="text-sm text-gray-400">Carregando profissionais...</span>
                  </div>
                ) : colabsError ? (
                  <div className="flex items-center justify-between py-3 px-3 bg-red-50 rounded-xl border border-red-100">
                    <p className="text-sm text-red-500">Erro ao carregar profissionais</p>
                    <button
                      type="button"
                      onClick={() => refetchColabs()}
                      className="text-xs text-red-600 underline"
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : (
                  <div className="border border-gray-100 rounded-xl divide-y divide-gray-50 bg-white max-h-52 overflow-y-auto shadow-sm">
                    {(Array.isArray(colaboradores) ? colaboradores : [])
                      .filter((c: any) =>
                        !colabSearch ||
                        c.user.name.toLowerCase().includes(colabSearch.toLowerCase())
                      )
                      .length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        {colabSearch ? "Nenhum profissional encontrado" : "Nenhum profissional cadastrado"}
                      </p>
                    ) : (
                      (Array.isArray(colaboradores) ? colaboradores : [])
                        .filter((c: any) =>
                          !colabSearch ||
                          c.user.name.toLowerCase().includes(colabSearch.toLowerCase())
                        )
                        .map((c: any) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => handleColaboradorSelect(c.id)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-violet-50 transition-colors text-left"
                          >
                            <div
                              className={`w-9 h-9 rounded-full bg-gradient-to-br ${nameGradient(
                                c.user.name
                              )} flex items-center justify-center text-white text-sm font-bold flex-shrink-0`}
                            >
                              {initials(c.user.name)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-sm text-gray-900 truncate">
                                {c.user.name}
                              </p>
                              {c.user.phone && (
                                <p className="text-xs text-gray-500">{c.user.phone}</p>
                              )}
                            </div>
                          </button>
                        ))
                    )}
                  </div>
                )}
              </div>
            )}

            {fieldErrors.colaboradorId && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors.colaboradorId}
              </p>
            )}
          </section>

          {/* Serviços */}
          <section>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              💈 Serviços
              {colaboradorId && selectedColaborador && (
                <span className="ml-2 text-violet-500 normal-case font-normal">
                  — {selectedColaborador.user.name.split(" ")[0]}
                </span>
              )}
            </label>

            {/* Search input — always visible */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar serviços..."
                value={servicoSearch}
                onChange={(e) => setServicoSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
              />
            </div>

            {filteredServicos.length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">
                  {servicoSearch ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredServicos.map((s: any) => {
                  const checked = servicoIds.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleServico(s.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                        checked
                          ? "border-violet-400 bg-violet-50"
                          : "border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/50"
                      }`}
                    >
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                          checked
                            ? "bg-violet-600 border-violet-600"
                            : "border-gray-300"
                        }`}
                      >
                        {checked && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={3}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-sm font-semibold ${
                            checked ? "text-violet-700" : "text-gray-800"
                          }`}
                        >
                          {s.nome}
                        </p>
                        <p className="text-xs text-gray-400">
                          {minutesToHuman(s.duracao)} • {formatBRL(s.preco)}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            {fieldErrors.servicoIds && (
              <p className="text-xs text-red-500 mt-1">
                {fieldErrors.servicoIds}
              </p>
            )}
          </section>

          {/* Resumo duração + valor */}
          {duracaoTotal > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-indigo-50 px-4 py-3 rounded-xl border border-violet-100">
              <span className="flex items-center gap-1.5 text-violet-700 text-sm font-medium">
                <Clock className="w-4 h-4" />
                {minutesToHuman(duracaoTotal)}
              </span>
              <span className="text-lg font-bold text-violet-700">
                {formatBRL(totalPrice)}
              </span>
            </div>
          )}

          {/* Data */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <CalendarDays className="w-3.5 h-3.5" /> Data
            </label>
            <input
              type="date"
              value={data}
              onChange={(e) => {
                setData(e.target.value);
                setFieldErrors((er) => ({ ...er, data: "" }));
              }}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
            />
            {fieldErrors.data && (
              <p className="text-xs text-red-500 mt-1">{fieldErrors.data}</p>
            )}
          </section>

          {/* Horários */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <Clock className="w-3.5 h-3.5" /> Horário
            </label>

            {loadingSlots ? (
              <div className="flex items-center justify-center py-8 bg-gray-50 rounded-xl">
                <Loader2 className="w-5 h-5 animate-spin text-violet-400" />
                <span className="ml-2 text-sm text-gray-400">
                  Verificando disponibilidade...
                </span>
              </div>
            ) : slots.length > 0 ? (
              <div>
                <SlotGroup label="Manhã" emoji="🌅" items={morning} />
                <SlotGroup label="Tarde" emoji="☀️" items={afternoon} />
                <SlotGroup label="Noite" emoji="🌙" items={evening} />
                {fieldErrors.hora && (
                  <p className="text-xs text-red-500 mt-1">
                    {fieldErrors.hora}
                  </p>
                )}
              </div>
            ) : colaboradorId && data ? (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">
                  {slotsMessage ?? "Nenhum horário disponível nesta data"}
                </p>
              </div>
            ) : (
              <div className="text-center py-8 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-400">
                  {!colaboradorId
                    ? "Selecione um profissional para ver os horários"
                    : "Selecione a data para ver os horários disponíveis"}
                </p>
              </div>
            )}
          </section>

          {/* Observações */}
          <section>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              <FileText className="w-3.5 h-3.5" /> Observações
            </label>
            <textarea
              placeholder="Preferências, alergias, etc. (opcional)"
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent bg-white"
            />
          </section>
        </div>

        {/* ── Fixed footer ── */}
        <div className="flex-shrink-0 px-6 py-4 border-t bg-white flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
            style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)" }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Confirmar agendamento"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
