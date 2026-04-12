"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Loader2, ShieldCheck, CheckCircle2, ArrowLeft } from "lucide-react";

const schema = z
  .object({
    password:        z.string().min(8, "Mínimo 8 caracteres"),
    passwordConfirm: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((d) => d.password === d.passwordConfirm, {
    message: "As senhas não conferem",
    path: ["passwordConfirm"],
  });

type FormData = z.infer<typeof schema>;

interface Props {
  token: string;
  tokenValid: boolean;
}

export function RedefinirSenhaForm({ token, tokenValid }: Props) {
  const router  = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw]   = useState(false);
  const [done, setDone]       = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", passwordConfirm: "" },
  });

  // ── Invalid / expired token ────────────────────────────────
  if (!tokenValid) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <ShieldCheck className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Link inválido</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Este link de redefinição é inválido ou já expirou.<br />
          Links são válidos por apenas 1 hora e de uso único.
        </p>
        <Link
          href="/esqueci-senha"
          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-black px-5 py-2.5 rounded-xl transition-colors"
        >
          Solicitar novo link
        </Link>
      </div>
    );
  }

  // ── Success state ──────────────────────────────────────────
  if (done) {
    return (
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-5">
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Senha redefinida!</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-6">
          Sua senha foi atualizada com sucesso.<br />Faça login com sua nova senha.
        </p>
        <button
          onClick={() => router.push("/login")}
          className="w-full h-12 rounded-xl text-sm font-black text-white transition-colors"
          style={{ background: "linear-gradient(135deg,#7c3aed,#6d28d9)", boxShadow: "0 4px 20px rgba(109,40,217,.35)" }}
        >
          Ir para o login
        </button>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────
  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/redefinir-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "Erro ao redefinir senha.");
        return;
      }
      setDone(true);
    } catch {
      toast.error("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Nova senha</FormLabel>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                    autoFocus
                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 text-sm pr-11
                               focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent"
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
          name="passwordConfirm"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">Confirmar nova senha</FormLabel>
              <FormControl>
                <Input
                  type={showPw ? "text" : "password"}
                  placeholder="Repita a nova senha"
                  autoComplete="new-password"
                  className="h-12 rounded-xl border-gray-200 bg-gray-50/50 text-sm
                             focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Password strength hints */}
        <ul className="text-[11px] text-gray-400 space-y-0.5 pl-1">
          {[
            { ok: form.watch("password").length >= 8,                 label: "Mínimo 8 caracteres" },
            { ok: /[A-Z]/.test(form.watch("password")),               label: "Uma letra maiúscula" },
            { ok: /[0-9]/.test(form.watch("password")),               label: "Um número" },
          ].map(({ ok, label }) => (
            <li key={label} className={`flex items-center gap-1.5 ${ok ? "text-emerald-500" : ""}`}>
              <span className={`w-1 h-1 rounded-full ${ok ? "bg-emerald-400" : "bg-gray-300"}`} />
              {label}
            </li>
          ))}
        </ul>

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-black gap-2"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
            boxShadow: "0 4px 20px rgba(109,40,217,.35)",
          }}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <><ShieldCheck className="w-4 h-4" /> Salvar nova senha</>
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
}
