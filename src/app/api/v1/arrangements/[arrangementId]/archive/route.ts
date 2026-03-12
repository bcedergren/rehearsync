import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as arrangementService from "@/lib/services/arrangement.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const POST = withAuth(async (_req, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { arrangementId: params.arrangementId });
  const arrangement = await arrangementService.archiveArrangement(
    params.arrangementId
  );
  return response.ok(arrangement);
});
