"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";

const schema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
  role: z.enum(["OWNER", "CLIENT", "BARBER"]),
  salonName: z.string().optional(),
  codigoConvite: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
}).refine((d) => d.role !== "OWNER" || (d.salonName && d.salonName.length >= 2), {
  message: "Nome do salão é obrigatório",
  path: ["salonName"],
}).refine((d) => d.role !== "BARBER" || (d.codigoConvite && d.codigoConvite.length >= 4), {
  message: "Código do salão é obrigatório",
  path: ["codigoConvite"],
});

type FormData = z.infer<typeof schema>;

const inputClass =
  "h-12 rounded-xl border-gray-200 bg-gray-50/50 text-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent";

export function RegistroForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) setRefCode(ref.toUpperCase());
  }, [searchParams]);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", role: "CLIENT", codigoConvite: "" },
  });

  const role = form.watch("role");

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, ...(refCode ? { refCode } : {}) }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erro ao criar conta");
        return;
      }

      toast.success("Conta criada com sucesso!", {
        description: "Faça login para acessar o sistema.",
      });
      router.push("/login");
    } catch {
      toast.error("Erro ao criar conta");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        {/* Referral banner */}
        {refCode && (
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm" style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)" }}>
            <span className="text-violet-500">🎁</span>
            <span className="text-violet-700 font-semibold text-xs">Indicação ativa — código <strong>{refCode}</strong></span>
          </div>
        )}

        {/* Account type */}
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Tipo de conta</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className={inputClass}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="CLIENT">Cliente — Quero agendar serviços</SelectItem>
                  <SelectItem value="OWNER">Proprietário — Tenho um salão</SelectItem>
                  <SelectItem value="BARBER">Funcionário — Trabalho em um salão</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Salon name (owner only) */}
        {role === "OWNER" && (
          <FormField
            control={form.control}
            name="salonName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Nome do salão</FormLabel>
                <FormControl>
                  <Input className={inputClass} placeholder="Ex: Barbearia do João" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Invite code (barber only) */}
        {role === "BARBER" && (
          <FormField
            control={form.control}
            name="codigoConvite"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Código do salão</FormLabel>
                <FormControl>
                  <Input
                    className={inputClass}
                    placeholder="Ex: XK7P2Q"
                    autoCapitalize="characters"
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                  />
                </FormControl>
                <p className="text-[11px] text-gray-400 mt-1">Peça o código ao proprietário do salão.</p>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Full name */}
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Nome completo</FormLabel>
              <FormControl>
                <Input className={inputClass} placeholder="Seu nome" autoComplete="name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Email + Phone */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Email</FormLabel>
                <FormControl>
                  <Input type="email" className={inputClass} placeholder="seu@email.com" autoComplete="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">WhatsApp</FormLabel>
                <FormControl>
                  <Input className={inputClass} placeholder="(11) 9xxxx-xxxx" autoComplete="tel" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Password + Confirm */}
        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Senha</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPw ? "text" : "password"}
                      className={`${inputClass} pr-11`}
                      placeholder="••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowPw((v) => !v)}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-semibold text-gray-700">Confirmar</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showConfirm ? "text" : "password"}
                      className={`${inputClass} pr-11`}
                      placeholder="••••••"
                      autoComplete="new-password"
                      {...field}
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      onClick={() => setShowConfirm((v) => !v)}
                    >
                      {showConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-black mt-2 gap-2"
          style={{
            background: loading ? "#6d28d9" : "linear-gradient(135deg,#7c3aed,#6d28d9)",
            boxShadow: "0 4px 20px rgba(109,40,217,.35)",
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              Criar conta grátis
            </>
          )}
        </Button>

        <p className="text-center text-[11px] text-gray-400 pt-1">
          Ao criar sua conta você concorda com os nossos{" "}
          <span className="text-violet-600 font-semibold">Termos de Uso</span>.
        </p>
      </form>
    </Form>
  );
}
