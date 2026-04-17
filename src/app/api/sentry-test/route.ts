import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    throw new Error("Sentry test — Bellefy salao-app [pode deletar]");
  } catch (e) {
    Sentry.captureException(e);
    return NextResponse.json({ error: "erro capturado pelo sentry" }, { status: 500 });
  }
}
