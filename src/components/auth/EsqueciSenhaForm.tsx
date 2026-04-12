"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Loader2, Mail, CheckCircle2 } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
});
type FormData = z.infer<typeof schema>;

export function EsqueciSenhaForm() {
  const [loading, setLoading]   = useState(false);
  const [enviado, setEnviado]   = useState(false);
  const [emailEnviado, setEmailEnviado] = useState("");

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/esqueci-senha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();

      if (res.status === 429) {
        toast.error(json.error ?? "Muitas tentativas. Aguarde alguns minutos.");
        return;
      }

      // Always show success (prevents email enumeration)
      setEmailEnviado(data.email);
      setEnviado(true);
    } catch {
      toast.error("Erro ao enviar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  // ── Success state ──────────────────────────────────────────
  if (enviado) {
    return (
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "linear-gradient(135deg,#ecfdf5,#d1fae5)" }}
        >
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>
        <h3 className="text-xl font-black text-gray-900 mb-2">Email enviado!</h3>
        <p className="text-gray-400 text-sm leading-relaxed mb-1">
          Se <span className="font-semibold text-gray-600">{emailEnviado}</span> estiver cadastrado,
          você receberá um link de redefinição em breve.
        </p>
        <p className="text-gray-300 text-xs mt-3 mb-6">
          Verifique também sua pasta de spam. O link expira em 1 hora.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-bold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>
      </div>
    );
  }

  // ── Form state ─────────────────────────────────────────────
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-gray-700">
                Email cadastrado
              </FormLabel>
              <FormControl>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    type="email"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    autoFocus
                    className="h-12 rounded-xl border-gray-200 bg-gray-50/50 pl-10 text-sm
                               focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          className="w-full h-12 rounded-xl text-sm font-black gap-2"
          style={{
            background: "linear-gradient(135deg,#7c3aed,#6d28d9)",
            boxShadow: "0 4px 20px rgba(109,40,217,.35)",
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Mail className="w-4 h-4" />
              Enviar link de redefinição
            </>
          )}
        </Button>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Lembrei! Voltar ao login
          </Link>
        </div>
      </form>
    </Form>
  );
}
