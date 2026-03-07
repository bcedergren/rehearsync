import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { updateSectionMarkerSchema } from "@/lib/validators/session";
import * as sectionService from "@/lib/services/section.service";

export const PATCH = withAuth(async (req: NextRequest, _ctx, params) => {
  const body = await req.json();
  const parsed = updateSectionMarkerSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const marker = await sectionService.updateSectionMarker(
    params.sectionMarkerId,
    parsed.data
  );
  return response.ok(marker);
});

export const DELETE = withAuth(async (_req, _ctx, params) => {
  await sectionService.deleteSectionMarker(params.sectionMarkerId);
  return response.ok({ deleted: true });
});
