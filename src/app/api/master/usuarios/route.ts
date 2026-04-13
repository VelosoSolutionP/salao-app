export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { addDays } from "date-fns";

const updateSchema = z.object({
  userId: z.string(),
  blocked: z.boolean().optional(),
  trialDays: z.number().int().min(1).max(3650).optional(), // extend trial by N days from today
  trialExpires: z.string().nullable().optional(), // set exact date
});

/** List all OWNER/BARBER users with trial/block status */
export async function GET() {
  const { error } = await requireRole(["MASTER"]);
  if (error) return error;

  const users = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "BARBER"] } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      blocked: true,
      trialExpires: true,
      createdAt: true,
      salons: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(users);
}

/** Update trial/block status for a user */
export async function PATCH(req: NextRequest) {
  const { error } = await requireRole(["MASTER"]);
  if (error) return error;

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { userId, blocked, trialDays, trialExpires } = parsed.data;

  const data: Record<string, unknown> = {};
  if (blocked !== undefined) data.blocked = blocked;
  if (trialDays !== undefined) data.trialExpires = addDays(new Date(), trialDays);
  if (trialExpires !== undefined) data.trialExpires = trialExpires ? new Date(trialExpires) : null;

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, name: true, email: true, blocked: true, trialExpires: true },
  });

  return NextResponse.json(user);
}
