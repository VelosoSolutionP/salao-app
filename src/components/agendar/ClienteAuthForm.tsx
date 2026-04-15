"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, UserPlus, LogIn } from "lucide-react";

// ─── Schemas ──────────────────────────────────────────────────────────────────

const registerSchema = z.object({
  name:            z.string().min(2, "Mínimo 2 caracteres"),
  email:           z.string().email("Email inválido"),
  phone:           z.string().optional(),
  password:        z.string().min(6, "Mínimo 6 caracteres"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

const loginSchema = z.object({
  email:    z.string().email("Email inválido"),
  password: z.string().min(1, "Informe sua senha"),
});

type RegisterData = z.infer<typeof registerSchema>;
type LoginData    = z.infer<typeof loginSchema>;

// ─── Shared styles ────────────────────────────────────────────────────────────

const inp = "w-full h-12 px-4 rounded-2xl border border-white/15 bg-white/10 text-white placeholder-white/30 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300/60 focus:border-transparent transition-all backdrop-blur-sm";

// ─── Register form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading]   = useState(false);
  const [showPw, setShowPw]     = useState(false);
  const [showCf, setShowCf]     = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<RegisterData>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(data: RegisterData) {
    setLoading(true);
    try {
      // 1. Criar conta
      const res = await fetch("/api/auth/registro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "CLIENT" }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Erro ao criar conta"); return; }

      // 2. Auto-login
      const result = await signIn("credentials", {
        email:    data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Conta criada, mas erro ao entrar. Faça login manualmente.");
        onSuccess();
        return;
      }

      toast.success("Conta criada! Vamos agendar.");
      onSuccess();
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <input
          {...register("name")}
          placeholder="Seu nome completo"
          autoComplete="name"
          className={inp}
        />
        {errors.name && <p className="text-red-300 text-xs mt-1 px-1">{errors.name.message}</p>}
      </div>

      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Seu e-mail"
          autoComplete="email"
          className={inp}
        />
        {errors.email && <p className="text-red-300 text-xs mt-1 px-1">{errors.email.message}</p>}
      </div>

      <div>
        <input
          {...register("phone")}
          type="tel"
          placeholder="WhatsApp (opcional)"
          autoComplete="tel"
          className={inp}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <div className="relative">
            <input
              {...register("password")}
              type={showPw ? "text" : "password"}
              placeholder="Senha"
              autoComplete="new-password"
              className={`${inp} pr-11`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
              {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {errors.password && <p className="text-red-300 text-xs mt-1 px-1">{errors.password.message}</p>}
        </div>
        <div>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type={showCf ? "text" : "password"}
              placeholder="Confirmar"
              autoComplete="new-password"
              className={`${inp} pr-11`}
            />
            <button type="button" tabIndex={-1}
              onClick={() => setShowCf(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
              {showCf ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
          {errors.confirmPassword && <p className="text-red-300 text-xs mt-1 px-1">{errors.confirmPassword.message}</p>}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-2xl bg-white text-violet-700 font-black text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-all active:scale-[0.98] shadow-lg shadow-black/20 disabled:opacity-70 mt-1"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin"/>
          : <><UserPlus className="w-4 h-4"/> Criar conta e agendar</>
        }
      </button>

      <p className="text-center text-[11px] text-white/25 pt-1">
        Ao criar sua conta você concorda com os Termos de Uso.
      </p>
    </form>
  );
}

// ─── Login form ───────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginData) {
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email:    data.email,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("E-mail ou senha incorretos.");
        return;
      }
      onSuccess();
    } catch {
      toast.error("Erro de conexão.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
      <div>
        <input
          {...register("email")}
          type="email"
          placeholder="Seu e-mail"
          autoComplete="email"
          className={inp}
        />
        {errors.email && <p className="text-red-300 text-xs mt-1 px-1">{errors.email.message}</p>}
      </div>
      <div>
        <div className="relative">
          <input
            {...register("password")}
            type={showPw ? "text" : "password"}
            placeholder="Senha"
            autoComplete="current-password"
            className={`${inp} pr-11`}
          />
          <button type="button" tabIndex={-1}
            onClick={() => setShowPw(v => !v)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition-colors">
            {showPw ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
        {errors.password && <p className="text-red-300 text-xs mt-1 px-1">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full h-12 rounded-2xl bg-white text-violet-700 font-black text-sm flex items-center justify-center gap-2 hover:bg-violet-50 transition-all active:scale-[0.98] shadow-lg shadow-black/20 disabled:opacity-70"
      >
        {loading
          ? <Loader2 className="w-4 h-4 animate-spin"/>
          : <><LogIn className="w-4 h-4"/> Entrar e agendar</>
        }
      </button>
    </form>
  );
}

// ─── ClienteAuthForm (exported) ───────────────────────────────────────────────

export function ClienteAuthForm() {
  const [tab, setTab] = useState<"cadastro" | "login">("cadastro");

  function onSuccess() {
    // Vai direto para /agendar para restaurar estado salvo (guest booking)
    window.location.href = "/agendar";
  }

  return (
    <div className="w-full">
      {/* Tabs */}
      <div
        className="flex rounded-2xl p-1 mb-5"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        {(["cadastro", "login"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 h-9 rounded-xl text-sm font-black transition-all ${
              tab === t
                ? "bg-white text-violet-700 shadow-md"
                : "text-white/50 hover:text-white/80"
            }`}
          >
            {t === "cadastro" ? "Criar conta" : "Já tenho conta"}
          </button>
        ))}
      </div>

      {tab === "cadastro"
        ? <RegisterForm onSuccess={onSuccess} />
        : <LoginForm    onSuccess={onSuccess} />
      }
    </div>
  );
}
