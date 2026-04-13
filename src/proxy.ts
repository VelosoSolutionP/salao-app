import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/registro",
  "/recuperar-senha",
  "/esqueci-senha",
  "/redefinir-senha",
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

  const role = session.user.role;

  // CLIENT → only /agendar
  if (role === "CLIENT") {
    if (!pathname.startsWith("/agendar") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/agendar", request.url));
    }
    return NextResponse.next();
  }

  // MASTER → must select a salon before entering the dashboard
  if (role === "MASTER") {
    const activeSalonId = request.cookies.get("active_salon_id")?.value;
    if (!activeSalonId && !pathname.startsWith("/selecionar-salao") && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/selecionar-salao", request.url));
    }
    // MASTER has access to everything — no further restrictions
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
    "/((?!_next/static|_next/image|favicon.ico|icons|sw.js|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)",
  ],
};
