import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createSessionSchema } from "@/lib/validators/session";
import * as sessionService from "@/lib/services/session.service";
import { requireFeature } from "@/lib/subscriptions/guards";

export const POST = withBandRole("leader", "admin")(async (req: NextRequest, ctx) => {
  await requireFeature(ctx.userId, "allowSessions");

  const body = await req.json();
  const parsed = createSessionSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const session = await sessionService.createSession(
    ctx.bandId,
    ctx.memberId,
    parsed.data
  );
  return response.created(session);
});
