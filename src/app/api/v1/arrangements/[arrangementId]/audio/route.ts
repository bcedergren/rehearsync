import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createAudioAssetSchema } from "@/lib/validators/upload";
import * as audioService from "@/lib/services/audio.service";
import { requireFeature, checkFreeTierLock } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const assets = await audioService.listAudioAssets(params.arrangementId);
  return response.ok(assets);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowAudioUploads");
  await checkFreeTierLock(ctx.userId, { arrangementId: params.arrangementId });

  const body = await req.json();
  const parsed = createAudioAssetSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const asset = await audioService.createAudioAsset(
    params.arrangementId,
    parsed.data
  );
  return response.created(asset);
});
