import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSheetMusicAssetSchema } from "@/lib/validators/upload";
import * as sheetMusicService from "@/lib/services/sheet-music.service";
import { requireFeature } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const assets = await sheetMusicService.listSheetMusicAssets(params.arrangementId);
  return response.ok(assets);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  const body = await req.json();
  const parsed = createSheetMusicAssetSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  // MusicXML requires Band tier or higher; PDF is allowed on Free
  if (parsed.data.fileType === "musicxml") {
    await requireFeature(ctx.userId, "allowMusicXml");
  }

  const asset = await sheetMusicService.createSheetMusicAsset(
    params.arrangementId,
    parsed.data
  );
  return response.created(asset);
});
