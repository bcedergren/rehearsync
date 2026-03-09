import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as inviteService from "@/lib/services/invite.service";
import { prisma } from "@/lib/prisma";

// GET — Get or create session join link
export const GET = withAuth(async (_req, ctx, params) => {
  const sessionId = params.sessionId as string;

  const session = await prisma.rehearsalSession.findUnique({
    where: { id: sessionId },
    select: { id: true, bandId: true, leaderMemberId: true, state: true },
  });

  if (!session) return response.notFound("Session not found");

  // Must be a band member
  const member = await prisma.member.findFirst({
    where: { bandId: session.bandId, userId: ctx.userId, isActive: true },
  });
  if (!member) return response.forbidden("Not a member of this band");

  // Only leader/admin can get invite links
  if (member.role !== "leader" && member.role !== "admin") {
    return response.forbidden("Only leaders and admins can share session links");
  }

  if (session.state === "ended") {
    return response.validationError("Cannot share link for an ended session");
  }

  const link = await inviteService.createSessionJoinLink(
    session.bandId,
    sessionId,
    member.id
  );

  return response.ok(link);
});
