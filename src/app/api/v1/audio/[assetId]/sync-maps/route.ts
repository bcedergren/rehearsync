import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSyncMapSchema } from "@/lib/validators/session";
import * as syncMapService from "@/lib/services/sync-map.service";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const maps = await syncMapService.listSyncMaps(params.assetId);
  return response.ok(maps);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowSyncMaps");

  const body = await req.json();
  const parsed = createSyncMapSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, isActive: true },
  });
  if (!member) return response.forbidden("No active membership");

  const syncMap = await syncMapService.createSyncMap(
    params.assetId,
    member.id,
    parsed.data
  );
  return response.created(syncMap);
});
