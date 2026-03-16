import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { updatePartSchema } from "@/lib/validators/part";
import * as partService from "@/lib/services/part.service";
import { checkFreeTierLock } from "@/lib/subscriptions/guards";

export const PATCH = withAuth(async (req: NextRequest, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { partId: params.partId });
  const body = await req.json();
  const parsed = updatePartSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const part = await partService.updatePart(params.partId, parsed.data);
  return response.ok(part);
});

export const DELETE = withAuth(async (req: NextRequest, ctx, params) => {
  await checkFreeTierLock(ctx.userId, { partId: params.partId });
  const force = req.nextUrl.searchParams.get("force") === "true";
  await partService.deletePart(params.partId, force);
  return response.ok({ deleted: true });
});
