"use client";

import { upload } from "@vercel/blob/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import {
  Plus, X, Loader2, Trash2, Share2, Camera, ChevronLeft, ChevronRight,
  Scissors, Sparkles, Palette, Star, Check, Download, Pencil, ZoomIn,
} from "lucide-react";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────
type Tipo = "CABELO" | "MAQUIAGEM" | "UNHA" | "COLORIMETRIA";

interface Colorimetria { marca: string; cor: string; oxidante: string; proporcao: string; notas: string; }

interface Transformacao {
  id: string;
  clienteNome: string;
  tipo: Tipo;
  fotoAntes: string | null;
  fotoDepois: string | null;
  colorimetria: Colorimetria | null;
  consentimento: boolean;
  compartilhado: boolean;
  observacao: string | null;
  createdAt: string;
}

type FormState = {
  clienteNome: string;
  tipo: Tipo;
  observacao: string;
  fotoAntes: string | null;
  fotoDepois: string | null;
  consentimento: boolean;
  colorimetria: Colorimetria;
};

const EMPTY_FORM: FormState = {
  clienteNome: "",
  tipo: "CABELO",
  observacao: "",
  fotoAntes: null,
  fotoDepois: null,
  consentimento: false,
  colorimetria: { marca: "", cor: "", oxidante: "", proporcao: "", notas: "" },
};

// ── Constants ─────────────────────────────────────────────────────────
const TIPOS: { value: Tipo; label: string; icon: React.ComponentType<{ className?: string }>; color: string }[] = [
  { value: "CABELO",       label: "Cabelo",       icon: Scissors, color: "#a855f7" },
  { value: "MAQUIAGEM",    label: "Maquiagem",    icon: Sparkles, color: "#ec4899" },
  { value: "UNHA",         label: "Unha",         icon: Star,     color: "#f59e0b" },
  { value: "COLORIMETRIA", label: "Colorimetria", icon: Palette,  color: "#06b6d4" },
];

function tipoInfo(tipo: Tipo) { return TIPOS.find((t) => t.value === tipo) ?? TIPOS[0]; }

// ── Upload ────────────────────────────────────────────────────────────
async function uploadFoto(file: File): Promise<string> {
  const blob = await upload(`transformacoes/${Date.now()}-${file.name}`, file, {
    access: "public",
    handleUploadUrl: "/api/upload",
  });
  return blob.url;
}

// ── Lightbox ──────────────────────────────────────────────────────────
function Lightbox({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded-xl text-white/70 hover:text-white hover:bg-white/10"
        onClick={onClose}
      >
        <X className="w-5 h-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Foto"
        className="max-w-full max-h-full object-contain rounded-xl"
        style={{ maxHeight: "90vh", maxWidth: "90vw" }}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

// ── CameraCapture ─────────────────────────────────────────────────────
function CameraCapture({
  label, value, onChange, onRemove,
}: {
  label: string;
  value: string | null;
  onChange: (url: string) => void;
  onRemove?: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [lightbox, setLightbox] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadFoto(file);
      onChange(url);
    } catch (err: any) {
      toast.error(err?.message ?? "Erro ao enviar foto");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <div>
      <p className="text-zinc-400 text-xs font-semibold mb-2">{label}</p>
      {value ? (
        <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt={label} className="w-full h-full object-cover" />

          {/* Always-visible action bar at bottom */}
          <div className="absolute bottom-0 inset-x-0 flex items-center gap-1.5 p-2" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)" }}>
            <button
              type="button"
              onClick={() => setLightbox(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <ZoomIn className="w-3.5 h-3.5" />
              Ver
            </button>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-white"
              style={{ background: "rgba(255,255,255,0.15)" }}
            >
              <Camera className="w-3.5 h-3.5" />
              Trocar
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={onRemove}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                style={{ background: "rgba(239,68,68,0.25)", color: "#fca5a5" }}
              >
                <X className="w-3.5 h-3.5" />
                Remover
              </button>
            )}
          </div>

          {uploading && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-xl flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-white/10 hover:border-violet-500/40 transition-colors disabled:opacity-50"
          style={{ background: "rgba(255,255,255,0.03)" }}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <span className="text-xs text-zinc-500">Enviando...</span>
            </>
          ) : (
            <>
              <Camera className="w-6 h-6 text-zinc-600" />
              <span className="text-xs text-zinc-500">Tirar foto / Galeria</span>
            </>
          )}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFile}
      />
      {lightbox && value && <Lightbox url={value} onClose={() => setLightbox(false)} />}
    </div>
  );
}

// ── TransformacaoFormModal (novo + editar) ────────────────────────────
function TransformacaoFormModal({
  initial,
  onClose,
}: {
  initial?: Transformacao;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const isEdit = !!initial;
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormState>(
    initial
      ? {
          clienteNome: initial.clienteNome,
          tipo: initial.tipo,
          observacao: initial.observacao ?? "",
          fotoAntes: initial.fotoAntes,
          fotoDepois: initial.fotoDepois,
          consentimento: initial.consentimento,
          colorimetria: (initial.colorimetria as Colorimetria) ?? EMPTY_FORM.colorimetria,
        }
      : { ...EMPTY_FORM }
  );

  function set(key: keyof FormState, value: unknown) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function salvar() {
    if (!form.clienteNome) return;
    setSaving(true);
    try {
      const body = {
        clienteNome: form.clienteNome,
        tipo: form.tipo,
        fotoAntes: form.fotoAntes,
        fotoDepois: form.fotoDepois,
        consentimento: form.consentimento,
        observacao: form.observacao || null,
        colorimetria:
          form.tipo === "COLORIMETRIA" && (form.colorimetria.marca || form.colorimetria.cor)
            ? form.colorimetria
            : null,
      };

      if (isEdit) {
        const res = await fetch("/api/transformacoes", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: initial!.id, ...body }),
        });
        if (!res.ok) throw new Error();
        toast.success("Transformação atualizada!");
      } else {
        const res = await fetch("/api/transformacoes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error();
        toast.success("Transformação salva!");
      }

      qc.invalidateQueries({ queryKey: ["transformacoes"] });
      onClose();
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  const info = tipoInfo(form.tipo);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-2xl overflow-hidden flex flex-col"
        style={{ background: "#1a1040", border: "1px solid rgba(124,58,237,0.3)", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <button onClick={() => setStep((s) => s - 1)} className="text-zinc-500 hover:text-zinc-300 mr-1">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <p className="text-white font-black text-sm">
              {isEdit ? "Editar transformação" : step === 1 ? "Nova Transformação" : step === 2 ? "Fotos" : "Consentimento"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!isEdit && (
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <div
                    key={s}
                    className="w-6 h-1.5 rounded-full transition-all"
                    style={{ background: s <= step ? info.color : "rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
            )}
            <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-5 space-y-4">
          {(step === 1 || isEdit) && (
            <>
              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Nome do cliente</label>
                <input
                  type="text"
                  value={form.clienteNome}
                  onChange={(e) => set("clienteNome", e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50"
                />
              </div>

              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-2">Tipo de serviço</label>
                <div className="grid grid-cols-2 gap-2">
                  {TIPOS.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => set("tipo", t.value)}
                      className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all"
                      style={
                        form.tipo === t.value
                          ? { background: `${t.color}20`, border: `1px solid ${t.color}60`, color: t.color }
                          : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#71717a" }
                      }
                    >
                      <t.icon className="w-4 h-4" />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {form.tipo === "COLORIMETRIA" && (
                <div className="space-y-3 p-3 rounded-xl" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.15)" }}>
                  <p className="text-cyan-400 text-xs font-black">Fórmula de colorimetria</p>
                  {[
                    { key: "marca",    label: "Marca do produto",      placeholder: "Ex: L'Oréal, Wella..." },
                    { key: "cor",      label: "Cor / Tonalidade",       placeholder: "Ex: 7.3 Louro Médio Dourado" },
                    { key: "oxidante", label: "Oxidante",               placeholder: "Ex: 20 volumes, 6%" },
                    { key: "proporcao",label: "Proporção de mistura",   placeholder: "Ex: 1:1, 1:1.5" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key}>
                      <label className="text-zinc-500 text-xs font-semibold block mb-1">{label}</label>
                      <input
                        type="text"
                        value={(form.colorimetria as any)[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, colorimetria: { ...f.colorimetria, [key]: e.target.value } }))
                        }
                        placeholder={placeholder}
                        className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  ))}
                  <div>
                    <label className="text-zinc-500 text-xs font-semibold block mb-1">Observações da fórmula</label>
                    <textarea
                      value={form.colorimetria.notas}
                      onChange={(e) => setForm((f) => ({ ...f, colorimetria: { ...f.colorimetria, notas: e.target.value } }))}
                      placeholder="Ex: aplicar do meio para as pontas..."
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-cyan-500/50 resize-none"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-zinc-400 text-xs font-semibold block mb-1.5">Observação (opcional)</label>
                <textarea
                  value={form.observacao}
                  onChange={(e) => set("observacao", e.target.value)}
                  placeholder="Detalhes do serviço..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm text-white bg-white/5 border border-white/10 outline-none focus:border-violet-500/50 resize-none"
                />
              </div>
            </>
          )}

          {(step === 2 || isEdit) && (
            <div className="space-y-4">
              {isEdit && <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">Fotos</p>}
              <CameraCapture label="Foto ANTES"  value={form.fotoAntes}  onChange={(url) => set("fotoAntes", url)}  onRemove={() => set("fotoAntes", null)} />
              <CameraCapture label="Foto DEPOIS" value={form.fotoDepois} onChange={(url) => set("fotoDepois", url)} onRemove={() => set("fotoDepois", null)} />
            </div>
          )}

          {(step === 3 || isEdit) && (
            <div className="space-y-4">
              {isEdit && <p className="text-zinc-500 text-xs font-semibold uppercase tracking-wide">Consentimento</p>}
              <div className="p-4 rounded-xl" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
                <p className="text-white text-sm font-bold mb-2">Autorização de imagem</p>
                <p className="text-zinc-400 text-xs leading-relaxed">
                  Autorizo o salão a utilizar minha imagem (fotos antes e depois) nas redes sociais,
                  site e materiais de divulgação do estabelecimento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => set("consentimento", !form.consentimento)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all"
                style={
                  form.consentimento
                    ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }
                }
              >
                <div
                  className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all"
                  style={form.consentimento ? { background: "#10b981" } : { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  {form.consentimento && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-semibold" style={{ color: form.consentimento ? "#10b981" : "#71717a" }}>
                  {form.consentimento ? "Cliente autorizou o compartilhamento" : "Cliente não autorizou ainda"}
                </span>
              </button>
              <p className="text-zinc-600 text-xs text-center">
                Sem autorização, as fotos ficam visíveis apenas internamente.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-2 flex gap-2 flex-shrink-0">
          {isEdit ? (
            <button
              onClick={salvar}
              disabled={saving || !form.clienteNome}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar alterações"}
            </button>
          ) : step < 3 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={step === 1 && !form.clienteNome}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: `linear-gradient(135deg,${info.color},${info.color}cc)` }}
            >
              Próximo <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={salvar}
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Salvar transformação"}
            </button>
          )}
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-zinc-500 hover:text-zinc-300">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TransformacaoCard ─────────────────────────────────────────────────
function TransformacaoCard({
  t,
  onDelete,
  onEdit,
  onToggleConsentimento,
}: {
  t: Transformacao;
  onDelete: () => void;
  onEdit: () => void;
  onToggleConsentimento: () => void;
}) {
  const info = tipoInfo(t.tipo);
  const col = t.colorimetria as Colorimetria | null;
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function compartilhar() {
    if (!t.fotoDepois) { toast.error("Adicione a foto depois para compartilhar"); return; }
    if (!t.consentimento) { toast.error("Cliente não autorizou o compartilhamento"); return; }
    try {
      if (navigator.share) {
        await navigator.share({ title: `Transformação ${info.label} — ${t.clienteNome}`, url: t.fotoDepois });
      } else {
        window.open(t.fotoDepois, "_blank");
      }
    } catch { /* user cancelled */ }
  }

  function baixar() {
    const url = t.fotoDepois || t.fotoAntes;
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `transformacao-${t.clienteNome}-${t.tipo.toLowerCase()}.jpg`;
    a.target = "_blank";
    a.click();
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden flex flex-col" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
        {/* Photos */}
        <div className="grid grid-cols-2 gap-0.5 bg-black/20">
          {([
            { url: t.fotoAntes, label: "Antes" },
            { url: t.fotoDepois, label: "Depois" },
          ] as const).map(({ url, label }) => (
            <div
              key={label}
              className="relative cursor-pointer"
              style={{ aspectRatio: "4/3" }}
              onClick={() => url && setLightbox(url)}
            >
              {url ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={label} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 hover:bg-black/30 transition-all flex items-center justify-center opacity-0 hover:opacity-100">
                    <ZoomIn className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <Camera className="w-5 h-5 text-zinc-700" />
                  <span className="text-[9px] text-zinc-700">Sem foto</span>
                </div>
              )}
              <span className="absolute bottom-1.5 left-1.5 px-2 py-0.5 rounded-md text-[10px] font-black pointer-events-none" style={{ background: "rgba(0,0,0,0.7)", color: url ? "#fff" : "#52525b" }}>
                {label}
              </span>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="p-3 space-y-2 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black flex-shrink-0" style={{ background: `${info.color}18`, color: info.color }}>
                <info.icon className="w-2.5 h-2.5" />
                {info.label}
              </span>
              <p className="text-white text-sm font-semibold truncate">{t.clienteNome}</p>
            </div>
            <p className="text-zinc-600 text-[10px] flex-shrink-0">{new Date(t.createdAt).toLocaleDateString("pt-BR")}</p>
          </div>

          {col && (col.marca || col.cor) && (
            <div className="p-2.5 rounded-lg space-y-1" style={{ background: "rgba(6,182,212,0.06)", border: "1px solid rgba(6,182,212,0.12)" }}>
              <p className="text-cyan-400 text-[10px] font-black uppercase tracking-wide">Fórmula</p>
              <div className="grid grid-cols-2 gap-1">
                {col.marca     && <p className="text-zinc-400 text-xs"><span className="text-zinc-600">Marca </span>{col.marca}</p>}
                {col.cor       && <p className="text-zinc-400 text-xs"><span className="text-zinc-600">Cor </span>{col.cor}</p>}
                {col.oxidante  && <p className="text-zinc-400 text-xs"><span className="text-zinc-600">Ox. </span>{col.oxidante}</p>}
                {col.proporcao && <p className="text-zinc-400 text-xs"><span className="text-zinc-600">Prop. </span>{col.proporcao}</p>}
              </div>
              {col.notas && <p className="text-zinc-500 text-xs italic">{col.notas}</p>}
            </div>
          )}

          {t.observacao && <p className="text-zinc-500 text-xs">{t.observacao}</p>}

          {/* Actions */}
          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
            <button
              onClick={onToggleConsentimento}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all"
              style={t.consentimento ? { background: "rgba(16,185,129,0.12)", color: "#10b981" } : { background: "rgba(255,255,255,0.05)", color: "#52525b" }}
            >
              <Check className="w-3 h-3" />
              {t.consentimento ? "Autorizado" : "Sem autorização"}
            </button>

            <div className="flex-1" />

            <button onClick={onEdit} title="Editar" className="p-1.5 rounded-lg text-zinc-600 hover:text-violet-400 hover:bg-violet-400/10 transition-all">
              <Pencil className="w-3.5 h-3.5" />
            </button>

            {t.consentimento && (
              <>
                <button onClick={compartilhar} title="Compartilhar" className="p-1.5 rounded-lg text-zinc-600 hover:text-pink-400 hover:bg-pink-400/10 transition-all">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
                <button onClick={baixar} title="Baixar foto" className="p-1.5 rounded-lg text-zinc-600 hover:text-emerald-400 hover:bg-emerald-400/10 transition-all">
                  <Download className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {confirmDelete ? (
              <div className="flex items-center gap-1">
                <button onClick={onDelete} className="px-2 py-1 rounded-lg text-[10px] font-bold text-red-400 bg-red-400/10 hover:bg-red-400/20 transition-all">
                  Confirmar
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 rounded-lg text-[10px] font-bold text-zinc-500 hover:text-zinc-300">
                  Não
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} title="Excluir" className="p-1.5 rounded-lg text-zinc-700 hover:text-red-400 hover:bg-red-400/10 transition-all">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {lightbox && <Lightbox url={lightbox} onClose={() => setLightbox(null)} />}
    </>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export function TransformacoesPage() {
  const qc = useQueryClient();
  const [novoModal, setNovoModal] = useState(false);
  const [editando, setEditando] = useState<Transformacao | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<Tipo | "TODOS">("TODOS");

  const { data: transformacoes = [], isLoading } = useQuery<Transformacao[]>({
    queryKey: ["transformacoes", filtroTipo],
    queryFn: () =>
      fetch(`/api/transformacoes${filtroTipo !== "TODOS" ? `?tipo=${filtroTipo}` : ""}`)
        .then((r) => r.json()),
    staleTime: 30_000,
  });

  async function deletar(id: string) {
    try {
      const res = await fetch(`/api/transformacoes?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Removida");
      qc.invalidateQueries({ queryKey: ["transformacoes"] });
    } catch {
      toast.error("Erro ao remover");
    }
  }

  async function toggleConsentimento(t: Transformacao) {
    try {
      await fetch("/api/transformacoes", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: t.id, consentimento: !t.consentimento }),
      });
      qc.invalidateQueries({ queryKey: ["transformacoes"] });
    } catch {
      toast.error("Erro ao atualizar");
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-white">Transformações</h1>
          <p className="text-zinc-500 text-sm mt-0.5">Antes & depois — cabelo, maquiagem, unhas e colorimetria</p>
        </div>
        <button
          onClick={() => setNovoModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white flex-shrink-0"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)" }}
        >
          <Plus className="w-4 h-4" />
          Nova transformação
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: "TODOS", label: "Todos" }, ...TIPOS.map((t) => ({ value: t.value, label: t.label }))].map((f) => {
          const info = f.value !== "TODOS" ? tipoInfo(f.value as Tipo) : null;
          const active = filtroTipo === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFiltroTipo(f.value as Tipo | "TODOS")}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={
                active
                  ? { background: info ? `${info.color}20` : "rgba(124,58,237,0.2)", color: info ? info.color : "#a78bfa", border: `1px solid ${info ? info.color + "40" : "rgba(124,58,237,0.4)"}` }
                  : { background: "rgba(255,255,255,0.05)", color: "#52525b", border: "1px solid rgba(255,255,255,0.08)" }
              }
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
        </div>
      ) : transformacoes.length === 0 ? (
        <div className="rounded-2xl flex flex-col items-center justify-center py-16 gap-3" style={{ background: "#12102a", border: "1px solid rgba(255,255,255,0.07)" }}>
          <Camera className="w-10 h-10 text-zinc-700" />
          <p className="text-zinc-500 text-sm font-semibold">Nenhuma transformação registrada</p>
          <p className="text-zinc-700 text-xs">Clique em "Nova transformação" para começar</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {transformacoes.map((t) => (
            <TransformacaoCard
              key={t.id}
              t={t}
              onDelete={() => deletar(t.id)}
              onEdit={() => setEditando(t)}
              onToggleConsentimento={() => toggleConsentimento(t)}
            />
          ))}
        </div>
      )}

      {novoModal && <TransformacaoFormModal onClose={() => setNovoModal(false)} />}
      {editando && <TransformacaoFormModal initial={editando} onClose={() => setEditando(null)} />}
    </div>
  );
}
