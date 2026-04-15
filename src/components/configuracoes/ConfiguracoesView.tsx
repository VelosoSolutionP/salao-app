"use client";

import { useState, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { upload } from "@vercel/blob/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save, Copy, Check, Users, ShieldAlert, ImagePlus, Trash2, Palette } from "lucide-react";
import { BellefyIcon } from "@/components/brand/BrandLogo";

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const PIX_TYPES = [
  { value: "CPF",    label: "CPF" },
  { value: "CNPJ",   label: "CNPJ" },
  { value: "EMAIL",  label: "Email" },
  { value: "PHONE",  label: "Telefone" },
  { value: "RANDOM", label: "Chave aleatória" },
];

interface SalonData {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  pixKey: string | null;
  pixKeyType: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  codigoConvite: string | null;
  cancelamentoHorasMinimo: number;
  multaValor: number | null;
  multaTipo: string | null;
  horarios: Array<{
    diaSemana: number;
    abre: string;
    fecha: string;
    fechado: boolean;
  }>;
}

const inputCls =
  "w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white disabled:opacity-50";

export function ConfiguracoesView({ salon }: { salon: SalonData | null }) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logoUrl, setLogoUrl]   = useState(salon?.logoUrl ?? "");
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName]         = useState(salon?.name ?? "");
  const [phone, setPhone]       = useState(salon?.phone ?? "");
  const [address, setAddress]   = useState(salon?.address ?? "");
  const [city, setCity]         = useState(salon?.city ?? "");
  const [pixKey, setPixKey]     = useState(salon?.pixKey ?? "");
  const [pixKeyType, setPixKeyType] = useState(
    PIX_TYPES.some((t) => t.value === salon?.pixKeyType)
      ? (salon!.pixKeyType as string)
      : "CPF"
  );
  const [cancelamentoHoras, setCancelamentoHoras] = useState(
    salon?.cancelamentoHorasMinimo ?? 24
  );
  const [multaValor, setMultaValor] = useState(
    salon?.multaValor != null ? String(salon.multaValor) : ""
  );
  const [multaTipo, setMultaTipo] = useState<"PERCENTUAL" | "FIXO">(
    (salon?.multaTipo as "PERCENTUAL" | "FIXO") ?? "FIXO"
  );

  async function handleLogoUpload(file: File) {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Logo deve ter no máximo 2 MB");
      return;
    }
    setLogoUploading(true);
    try {
      const blob = await upload(`logos/${Date.now()}-${file.name}`, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      setLogoUrl(blob.url);
      // Save immediately so it persists even if user doesn't click "Salvar"
      await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() || salon?.name, logoUrl: blob.url }),
      });
      qc.invalidateQueries({ queryKey: ["salon-name"] });
      qc.invalidateQueries({ queryKey: ["salon-logo"] });
      toast.success("Logo atualizada!");
    } catch {
      toast.error("Erro ao enviar logo");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    setLogoUrl("");
    await fetch("/api/configuracoes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() || salon?.name, logoUrl: null }),
    });
    qc.invalidateQueries({ queryKey: ["salon-name"] });
    qc.invalidateQueries({ queryKey: ["salon-logo"] });
    toast.success("Logo removida");
  }

  function copyCode() {
    if (!salon?.codigoConvite) return;
    navigator.clipboard.writeText(salon.codigoConvite);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const [horarios, setHorarios] = useState<
    Record<number, { abre: string; fecha: string; fechado: boolean }>
  >(() => {
    const h: Record<number, { abre: string; fecha: string; fechado: boolean }> = {};
    for (let d = 0; d <= 6; d++) {
      const existing = salon?.horarios?.find((x) => x.diaSemana === d);
      h[d] = existing
        ? { abre: existing.abre, fecha: existing.fecha, fechado: existing.fechado }
        : { abre: "08:00", fecha: "20:00", fechado: d === 0 };
    }
    return h;
  });

  async function handleSave() {
    if (name.trim().length < 2) {
      toast.error("Nome do salão obrigatório (mínimo 2 caracteres)");
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        logoUrl: logoUrl || null,
        horarios: Object.entries(horarios).map(([dia, h]) => ({
          diaSemana: parseInt(dia),
          ...h,
        })),
      };
      if (phone.trim())   body.phone   = phone.trim();
      if (address.trim()) body.address = address.trim();
      if (city.trim())    body.city    = city.trim();
      if (pixKey.trim()) {
        body.pixKey    = pixKey.trim();
        body.pixKeyType = pixKeyType;
      }

      // Cancellation policy
      body.cancelamentoHorasMinimo = cancelamentoHoras;
      if (multaValor.trim()) {
        body.multaValor = parseFloat(multaValor);
        body.multaTipo  = multaTipo;
      } else {
        body.multaValor = null;
        body.multaTipo  = null;
      }

      const res = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        toast.success("Configurações salvas!");
        qc.invalidateQueries({ queryKey: ["salon-name"] });
      } else {
        const json = await res.json().catch(() => ({}));
        toast.error(json.error ?? "Erro ao salvar");
      }
    } catch {
      toast.error("Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* ── Identidade Visual ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-500" />
            Identidade Visual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Adicione a logo do seu salão. Ela aparece na barra lateral, na tela inicial e no
            perfil público do salão.
          </p>

          <div className="flex items-center gap-5">
            {/* Preview */}
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center flex-shrink-0 overflow-hidden"
              style={
                logoUrl
                  ? { border: "2px solid #e5e7eb" }
                  : {
                      background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                      boxShadow: "0 0 0 1px rgba(124,58,237,.3), 0 4px 20px rgba(124,58,237,.35)",
                    }
              }
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <BellefyIcon size={28} className="text-white" />
              )}
            </div>

            {/* Actions */}
            <div className="flex-1 space-y-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleLogoUpload(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={logoUploading}
                onClick={() => logoInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 w-full justify-center"
              >
                {logoUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {logoUploading ? "Enviando…" : logoUrl ? "Trocar logo" : "Enviar logo"}
              </button>

              {logoUrl && (
                <button
                  type="button"
                  onClick={handleLogoRemove}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl text-sm font-semibold transition-colors w-full justify-center"
                >
                  <Trash2 className="w-4 h-4" />
                  Remover logo
                </button>
              )}

              <p className="text-[11px] text-gray-400 text-center">
                PNG, JPG ou WebP · Máx. 2 MB · Recomendado: 200×200 px
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Informações do Salão */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Informações do Salão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Nome do salão</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Telefone</label>
              <input
                type="text"
                placeholder="(11) 9xxxx-xxxx"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Cidade</label>
              <input
                type="text"
                placeholder="São Paulo"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Endereço</label>
            <input
              type="text"
              placeholder="Rua, número, bairro"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className={inputCls}
            />
          </div>
        </CardContent>
      </Card>

      {/* Chave PIX */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Chave PIX</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo de chave</label>
              <select
                value={pixKeyType}
                onChange={(e) => setPixKeyType(e.target.value)}
                className={inputCls}
              >
                {PIX_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Chave PIX</label>
              <input
                type="text"
                placeholder="Sua chave PIX"
                value={pixKey}
                onChange={(e) => setPixKey(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Código de Convite para Funcionários */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-500" />
            Código de acesso para funcionários
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-500">
            Compartilhe este código com seus funcionários ao cadastrá-los. Somente quem tiver
            este código poderá se registrar como funcionário do seu salão.
          </p>
          <div className="flex items-center gap-2">
            <div className={`${inputCls} flex-1 font-mono font-black text-lg tracking-widest text-violet-700 bg-violet-50 border-violet-200`}>
              {salon?.codigoConvite ?? "—"}
            </div>
            <button
              type="button"
              onClick={copyCode}
              disabled={!salon?.codigoConvite}
              className="flex items-center gap-1.5 px-3 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? "Copiado!" : "Copiar"}
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Na tela de cadastro, o funcionário escolhe "Funcionário" e informa este código.
          </p>
        </CardContent>
      </Card>

      {/* Política de Cancelamento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-violet-500" />
            Política de cancelamento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Define o prazo mínimo de antecedência para cancelamento sem penalidade. Cancelamentos
            fora deste prazo são registrados como não comparecimento, e a multa (se configurada)
            é cobrada no próximo agendamento do cliente.
          </p>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Prazo mínimo para cancelamento (horas)
            </label>
            <input
              type="number"
              min={0}
              max={168}
              value={cancelamentoHoras}
              onChange={(e) => setCancelamentoHoras(parseInt(e.target.value) || 0)}
              className={inputCls}
            />
            <p className="text-xs text-gray-400 mt-1">
              Ex: 24 = cliente deve cancelar com pelo menos 24h de antecedência.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Tipo de multa
              </label>
              <select
                value={multaTipo}
                onChange={(e) => setMultaTipo(e.target.value as "PERCENTUAL" | "FIXO")}
                className={inputCls}
              >
                <option value="FIXO">Valor fixo (R$)</option>
                <option value="PERCENTUAL">Percentual do serviço (%)</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Valor da multa {multaTipo === "PERCENTUAL" ? "(%)" : "(R$)"}
              </label>
              <input
                type="number"
                min={0}
                step={multaTipo === "PERCENTUAL" ? 1 : 0.01}
                placeholder={multaTipo === "PERCENTUAL" ? "Ex: 50" : "Ex: 30.00"}
                value={multaValor}
                onChange={(e) => setMultaValor(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {!multaValor && (
            <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
              Sem multa configurada. Cancelamentos fora do prazo serão registrados como não
              comparecimento, mas nenhuma taxa será cobrada.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Horário de Funcionamento */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Horário de Funcionamento</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[0, 1, 2, 3, 4, 5, 6].map((dia) => (
            <div key={dia} className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={!horarios[dia]?.fechado}
                onChange={(e) =>
                  setHorarios((prev) => ({
                    ...prev,
                    [dia]: { ...prev[dia], fechado: !e.target.checked },
                  }))
                }
                className="w-4 h-4 accent-violet-600"
              />
              <span className="w-8 text-sm font-medium text-gray-600">{DIAS[dia]}</span>
              <input
                type="time"
                value={horarios[dia]?.abre ?? "08:00"}
                disabled={horarios[dia]?.fechado}
                onChange={(e) =>
                  setHorarios((prev) => ({
                    ...prev,
                    [dia]: { ...prev[dia], abre: e.target.value },
                  }))
                }
                className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-40 bg-white"
              />
              <span className="text-gray-400 text-sm">às</span>
              <input
                type="time"
                value={horarios[dia]?.fecha ?? "20:00"}
                disabled={horarios[dia]?.fechado}
                onChange={(e) =>
                  setHorarios((prev) => ({
                    ...prev,
                    [dia]: { ...prev[dia], fecha: e.target.value },
                  }))
                }
                className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 disabled:opacity-40 bg-white"
              />
              {horarios[dia]?.fechado && (
                <span className="text-xs text-gray-400">Fechado</span>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações
      </button>
    </div>
  );
}
