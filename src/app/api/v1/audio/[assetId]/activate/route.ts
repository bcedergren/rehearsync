import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as audioService from "@/lib/services/audio.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const asset = await audioService.activateAudioAsset(params.assetId);
  return response.ok(asset);
});
