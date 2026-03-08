import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as syncMapService from "@/lib/services/sync-map.service";

export const DELETE = withAuth(async (_req, _ctx, params) => {
  await syncMapService.deleteSyncMapPoint(params.pointId);
  return response.ok({ deleted: true });
});
