import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { updateBandSchema } from "@/lib/validators/band";
import * as bandService from "@/lib/services/band.service";

export const GET = withBandRole()(async (_req, ctx) => {
  const band = await bandService.getBand(ctx.bandId);
  return response.ok(band);
});

export const PATCH = withBandRole("leader", "admin")(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const parsed = updateBandSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const band = await bandService.updateBand(ctx.bandId, parsed.data);
  return response.ok(band);
});
