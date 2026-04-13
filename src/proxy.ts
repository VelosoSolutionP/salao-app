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
  "/api/auth",
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

  // MASTER → has its own panel at /master/*
  if (role === "MASTER") {
    // Always allow /master/* and /api/*
    if (pathname.startsWith("/master") || pathname.startsWith("/api/")) {
      return NextResponse.next();
    }
    // Allow regular dashboard routes only when a salon is selected
    const activeSalonId = request.cookies.get("active_salon_id")?.value;
    if (!activeSalonId) {
      return NextResponse.redirect(new URL("/master", request.url));
    }
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|icon-192.png|icon-512.png|icon-maskable.png|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
