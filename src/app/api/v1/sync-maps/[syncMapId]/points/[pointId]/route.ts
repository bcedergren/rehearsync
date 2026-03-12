import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as syncMapService from "@/lib/services/sync-map.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const DELETE = withAuth(async (_req, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { syncMapId: params.syncMapId });
  await syncMapService.deleteSyncMapPoint(params.pointId);
  return response.ok({ deleted: true });
});
