import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { updateArrangementSchema } from "@/lib/validators/arrangement";
import * as arrangementService from "@/lib/services/arrangement.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const arrangement = await arrangementService.getArrangement(params.arrangementId);
  return response.ok(arrangement);
});

export const PATCH = withAuth(async (req: NextRequest, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { arrangementId: params.arrangementId });
  const body = await req.json();
  const parsed = updateArrangementSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const arrangement = await arrangementService.updateArrangement(
    params.arrangementId,
    parsed.data
  );
  return response.ok(arrangement);
});
