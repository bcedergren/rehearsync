import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createBandSchema } from "@/lib/validators/band";
import * as bandService from "@/lib/services/band.service";
import { checkBandLimit } from "@/lib/subscriptions/guards";

export const GET = withAuth(async (_req, ctx) => {
  const bands = await bandService.listBandsForUser(ctx.userId);
  return response.ok(bands);
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  await checkBandLimit(ctx.userId);

  const body = await req.json();
  const parsed = createBandSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const band = await bandService.createBand(ctx.userId, ctx.email, parsed.data);
  return response.created(band);
});
