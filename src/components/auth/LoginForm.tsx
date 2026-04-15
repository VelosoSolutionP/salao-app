"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";

const schema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
type FormData = z.infer<typeof schema>;

export function LoginForm({
  dark = false,
  callbackUrl = "/dashboard",
}: {
  dark?: boolean;
  callbackUrl?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(data: FormData) {
    setLoading(true);
    try {
      const result = await signIn("credentials", { ...data, redirect: false });
      if (result?.error) {
        toast.error("Email ou senha incorretos", {
          description: "Verifique suas credenciais e tente novamente.",
        });
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      toast.error("Erro ao fazer login", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  }

  const labelCls = dark
    ? "text-sm font-semibold text-zinc-400"
    : "text-sm font-semibold text-gray-700";
  const inputCls = dark
    ? "h-12 rounded-xl border-white/10 bg-white/5 text-white placeholder:text-zinc-600 text-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent"
    : "h-12 rounded-xl border-gray-200 bg-gray-50/50 text-sm focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:border-transparent";

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelCls}>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className={inputCls}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel className={labelCls}>Senha</FormLabel>
                <Link
                  href="/esqueci-senha"
                  className={dark
                    ? "text-xs text-violet-400 hover:text-violet-300 font-semibold transition-colors"
                    : "text-xs text-violet-600 hover:text-violet-700 font-semibold transition-colors"}
                  tabIndex={-1}
                >
                  Esqueci minha senha
                </Link>
              </div>
              <FormControl>
                <div className="relative">
                  <Input
                    type={showPw ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={`${inputCls} pr-11`}
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
              <LogIn className="w-4 h-4" />
              Entrar
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
