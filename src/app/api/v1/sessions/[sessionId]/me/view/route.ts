import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as sessionService from "@/lib/services/session.service";
import { prisma } from "@/lib/prisma";

export const GET = withAuth(async (_req, ctx, params) => {
  const session = await prisma.rehearsalSession.findUnique({
    where: { id: params.sessionId },
  });
  if (!session) return response.notFound("Session not found");

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, bandId: session.bandId, isActive: true },
  });
  if (!member) return response.forbidden("Not a member of this band");

  const view = await sessionService.getMusicianView(
    params.sessionId,
    member.id
  );
  return response.ok(view);
});
