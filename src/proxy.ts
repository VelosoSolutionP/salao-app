import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/registro",
  "/recuperar-senha",
  "/esqueci-senha",
  "/redefinir-senha",
  "/bloqueado",
  "/api/agendamentos/disponibilidade",
  "/api/auth",
  "/api/webhook",
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

  // /agendar é público para visitantes, mas salão/equipe/master → redireciona pro painel
  if (pathname.startsWith("/agendar")) {
    const session = await auth();
    if (session?.user) {
      const role = (session.user as { role: string }).role;
      if (role === "OWNER" || role === "BARBER") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      if (role === "MASTER") {
        const res = NextResponse.redirect(new URL("/master", request.url));
        res.cookies.delete("active_salon_id");
        return res;
      }
    }
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

  // ── Trial / block check ──────────────────────────────────────────────────
  if (role !== "MASTER" && !pathname.startsWith("/api/")) {
    if (blocked) {
      return NextResponse.redirect(new URL("/bloqueado?motivo=bloqueado", request.url));
    }
    if (trialExpires && new Date(trialExpires) < new Date()) {
      return NextResponse.redirect(new URL("/bloqueado?motivo=trial", request.url));
    }
  }

  // ── Role routing ─────────────────────────────────────────────────────────

  // CLIENT → só /agendar
  if (role === "CLIENT") {
    if (!pathname.startsWith("/agendar") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/agendar", request.url));
    }
    return NextResponse.next();
  }

  // MASTER → /master
  if (role === "MASTER") {
    if (pathname.startsWith("/master") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    const res = NextResponse.redirect(new URL("/master", request.url));
    res.cookies.delete("active_salon_id");
    return res;
  }

  // OWNER-only routes (BARBER → /agenda)
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|icon-192.png|icon-512.png|icon-maskable.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
