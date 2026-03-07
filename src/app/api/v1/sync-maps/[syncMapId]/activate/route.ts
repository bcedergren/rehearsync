import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as syncMapService from "@/lib/services/sync-map.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const syncMap = await syncMapService.activateSyncMap(params.syncMapId);
  return response.ok(syncMap);
});
