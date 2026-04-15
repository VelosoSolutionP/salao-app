import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/registro",        // kept for potential future admin-invite flow
  "/recuperar-senha",
  "/esqueci-senha",
  "/redefinir-senha",
  "/bloqueado",       // trial/blocked page — always accessible
  "/agendar",                              // público — visitantes podem ver e iniciar agendamento
  "/api/agendamentos/disponibilidade",     // leitura pública de horários disponíveis
  "/api/auth",
  "/api/webhook",     // webhooks externos (Mercado Pago, etc.)
  "/_next",
  "/favicon.ico",
  "/icons",
  "/sw.js",
  "/manifest.json",
  "/manifest.webmanifest",
  "/robots.txt",
  "/sitemap.xml",
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = await auth();

  if (!session?.user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const { role, blocked, trialExpires } = session.user as {
    role: string;
    blocked: boolean;
    trialExpires: string | null;
  };

  // ── Trial / block check (skip for MASTER — never restricted) ────────────
  if (role !== "MASTER" && !pathname.startsWith("/api/")) {
    if (blocked) {
      return NextResponse.redirect(new URL("/bloqueado?motivo=bloqueado", request.url));
    }
    if (trialExpires && new Date(trialExpires) < new Date()) {
      return NextResponse.redirect(new URL("/bloqueado?motivo=trial", request.url));
    }
  }

  // ── Role routing ─────────────────────────────────────────────────────────

  // CLIENT → only /agendar
  if (role === "CLIENT") {
    if (!pathname.startsWith("/agendar") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/agendar", request.url));
    }
    return NextResponse.next();
  }

  // MASTER → sempre vai para /master, nunca acessa rotas de salão
  if (role === "MASTER") {
    if (pathname.startsWith("/master") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    // Limpa o cookie de salão ativo e redireciona para o painel master
    const res = NextResponse.redirect(new URL("/master", request.url));
    res.cookies.delete("active_salon_id");
    return res;
  }

  // OWNER-only management routes (BARBER gets redirected to agenda)
  if (
    (pathname.startsWith("/relatorios") ||
      pathname.startsWith("/financeiro") ||
      pathname.startsWith("/equipe") ||
      pathname.startsWith("/marketing") ||
      pathname.startsWith("/configuracoes")) &&
    role !== "OWNER"
  ) {
    return NextResponse.redirect(new URL("/agenda", request.url));
  }

  // /transformacoes is accessible to OWNER and BARBER (already passed role checks above)

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|icon-192.png|icon-512.png|icon-maskable.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
