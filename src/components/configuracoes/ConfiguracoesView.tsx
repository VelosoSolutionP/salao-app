"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

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
