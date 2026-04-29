import type { ZodError } from "zod";

/** Extrai mensagem legível de um ZodError para retornar na API */
export function zodMsg(error: ZodError): string {
  return error.issues.map((e) => e.message).join("; ");
}

/** Client-side: converte qualquer formato de erro em string para toast */
export function errMsg(err: unknown, fallback = "Erro desconhecido"): string {
  if (!err) return fallback;
  if (typeof err === "string") return err || fallback;
  if (typeof err === "object") {
    // Zod flatten: { formErrors, fieldErrors }
    const z = err as Record<string, unknown>;
    if (Array.isArray(z.formErrors) && z.formErrors.length) return z.formErrors[0] as string;
    if (z.fieldErrors && typeof z.fieldErrors === "object") {
      const msgs = Object.values(z.fieldErrors as Record<string, string[]>).flat();
      if (msgs.length) return msgs[0];
    }
    // { message: string }
    if (typeof z.message === "string") return z.message;
  }
  return fallback;
}
