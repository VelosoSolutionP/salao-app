import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export type AuthSession = {
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    salonId: string | null;
    image?: string | null;
  };
};

export async function requireAuth(): Promise<
  { session: AuthSession; error: null } | { session: null; error: Response }
> {
  const session = await auth();
  if (!session?.user) {
    return {
      session: null,
      error: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }
  return { session: session as AuthSession, error: null };
}

export async function requireRole(
  roles: Role[]
): Promise<
  { session: AuthSession; error: null } | { session: null; error: Response }
> {
  const result = await requireAuth();
  if (result.error || !result.session) return { session: null, error: result.error! };

  if (!roles.includes(result.session.user.role)) {
    return {
      session: null,
      error: NextResponse.json({ error: "Sem permissão" }, { status: 403 }),
    };
  }
  return { session: result.session, error: null };
}

/** Returns the active salonId — checks the multi-salon cookie first, then falls back to the session JWT. */
export async function requireSalon(
  session: AuthSession
): Promise<{ salonId: string; error: null } | { salonId: null; error: Response }> {
  // Multi-salon: honour the cookie set by /api/saloes/switch
  const cookieStore = await cookies();
  const cookieSalonId = cookieStore.get("active_salon_id")?.value;

  const salonId = cookieSalonId || session?.user?.salonId || null;

  if (!salonId) {
    return {
      salonId: null,
      error: NextResponse.json({ error: "Salão não configurado" }, { status: 400 }),
    };
  }
  return { salonId, error: null };
}
