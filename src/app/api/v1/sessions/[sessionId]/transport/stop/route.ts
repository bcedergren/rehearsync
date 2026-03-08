import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { transportStopSchema } from "@/lib/validators/transport";
import * as transportService from "@/lib/services/transport.service";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";
import { broadcastStop } from "@/lib/ws-broadcast";

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowTransportControls");

  const body = await req.json();
  const parsed = transportStopSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, isActive: true },
  });
  if (!member) return response.forbidden("No active membership");

  const transport = await transportService.stop(
    params.sessionId,
    member.id,
    parsed.data.positionMs
  );

  await broadcastStop(params.sessionId, transport.positionMs);

  return response.ok(transport);
});
