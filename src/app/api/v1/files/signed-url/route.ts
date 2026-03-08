import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSignedDownloadUrl } from "@/lib/supabase-storage";

export const POST = withAuth(async (req: NextRequest) => {
  const body = await req.json();
  const { objectKey } = body;

  if (!objectKey || objectKey.includes("..")) {
    return response.validationError("Invalid object key");
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "rehearsync-assets";

  try {
    const signedUrl = await createSignedDownloadUrl(bucket, objectKey, 3600);
    return response.ok({ signedUrl });
  } catch {
    return response.notFound(`File not found: ${objectKey}`);
  }
});
