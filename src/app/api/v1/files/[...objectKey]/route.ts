import { NextRequest, NextResponse } from "next/server";
import { readObject } from "@/lib/supabase-storage";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";

export const GET = withAuth(async (_req: NextRequest, _ctx, params) => {
  const raw = params.objectKey;
  const objectKey = Array.isArray(raw) ? raw.join("/") : String(raw);
  if (!objectKey || objectKey.includes("..")) {
    return response.validationError("Invalid file path");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "rehearsync-assets";

  try {
    const data = await readObject(bucket, objectKey);

    const ext = objectKey.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      xml: "application/xml",
      musicxml: "application/vnd.recordare.musicxml+xml",
      mxl: "application/vnd.recordare.musicxml",
      wav: "audio/wav",
      mp3: "audio/mpeg",
      m4a: "audio/mp4",
      aac: "audio/aac",
    };

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeMap[ext || ""] || "application/octet-stream",
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return response.notFound(`File not found: ${objectKey}`);
  }
});
