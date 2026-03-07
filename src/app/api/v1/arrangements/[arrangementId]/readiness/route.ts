import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as arrangementService from "@/lib/services/arrangement.service";

export const GET = withAuth(async (_req, _ctx, params) => {
  const readiness = await arrangementService.getReadiness(params.arrangementId);
  return response.ok(readiness);
});
