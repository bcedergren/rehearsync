import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { addSyncMapPointsSchema } from "@/lib/validators/session";
import * as syncMapService from "@/lib/services/sync-map.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { syncMapId: params.syncMapId });
  const body = await req.json();
  const parsed = addSyncMapPointsSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const result = await syncMapService.addSyncMapPoints(
    params.syncMapId,
    parsed.data
  );
  return response.created(result);
});
