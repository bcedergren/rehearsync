import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSectionMarkerSchema } from "@/lib/validators/session";
import * as sectionService from "@/lib/services/section.service";
import { requireFeature, checkFreeTierLock } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, _ctx, params) => {
  const markers = await sectionService.listSectionMarkers(params.arrangementId);
  return response.ok(markers);
});

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowSectionMarkers");
  await checkFreeTierLock(ctx.userId, { arrangementId: params.arrangementId });

  const body = await req.json();
  const parsed = createSectionMarkerSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const marker = await sectionService.createSectionMarker(
    params.arrangementId,
    parsed.data
  );
  return response.created(marker);
});
