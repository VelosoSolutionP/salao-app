import { NextRequest } from "next/server";
import { requireAuth, requireSalon } from "@/lib/auth-guard";
import { createSSEStream } from "@/lib/sse";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: NextRequest) {
  const { session, error } = await requireAuth();
  if (error) return error;

  const { salonId, error: salonError } = requireSalon(session!);
  if (salonError) return salonError;

  const stream = createSSEStream(salonId!);

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
