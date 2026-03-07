import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as sheetMusicService from "@/lib/services/sheet-music.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const asset = await sheetMusicService.retireSheetMusicAsset(params.assetId);
  return response.ok(asset);
});
