import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { joinSessionSchema } from "@/lib/validators/session";
import * as sessionService from "@/lib/services/session.service";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowSessions");

  const body = await req.json();
  const parsed = joinSessionSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const session = await prisma.rehearsalSession.findUnique({
    where: { id: params.sessionId },
  });
  if (!session) return response.notFound("Session not found");

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, bandId: session.bandId, isActive: true },
  });
  if (!member) return response.forbidden("Not a member of this band");

  const participant = await sessionService.joinSession(
    params.sessionId,
    member.id,
    parsed.data
  );
  return response.ok(participant);
});
