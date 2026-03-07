import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createArrangementSchema } from "@/lib/validators/arrangement";
import * as arrangementService from "@/lib/services/arrangement.service";
import { checkArrangementLimit } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const arrangements = await arrangementService.listArrangements(params.songId);
  return response.ok(arrangements);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await checkArrangementLimit(params.songId, ctx.userId);

  const body = await req.json();
  const parsed = createArrangementSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const arrangement = await arrangementService.createArrangement(
    params.songId,
    ctx.userId,
    parsed.data
  );
  return response.created(arrangement);
});
