export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { requireAuth } from "@/lib/auth-guard";

// Handles both: token generation (client → here → blob) and upload completion callback
export async function POST(req: NextRequest) {
  const { error } = await requireAuth();
  if (error) return error;

  const body = (await req.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"],
          maximumSizeInBytes: 15 * 1024 * 1024, // 15 MB
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[upload] Concluído:", blob.url);
      },
    });
    return NextResponse.json(jsonResponse);
  } catch (err: any) {
    console.error("[upload] Erro:", err?.message ?? err);
    return NextResponse.json({ error: String(err?.message ?? err) }, { status: 400 });
  }
}
