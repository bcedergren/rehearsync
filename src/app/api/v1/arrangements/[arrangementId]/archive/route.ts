import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as arrangementService from "@/lib/services/arrangement.service";

export const POST = withAuth(async (_req, _ctx, params) => {
  const arrangement = await arrangementService.archiveArrangement(
    params.arrangementId
  );
  return response.ok(arrangement);
});
