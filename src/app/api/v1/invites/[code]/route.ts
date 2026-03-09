import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import * as inviteService from "@/lib/services/invite.service";
import { prisma } from "@/lib/prisma";

// GET — Preview invite details (band name, type, already member?)
export const GET = withAuth(async (_req: NextRequest, ctx, params) => {
  const code = params.code as string;

  try {
    const link = await inviteService.resolveInviteLink(code);

    const isMember = await prisma.member.findFirst({
      where: { bandId: link.bandId, userId: ctx.userId, isActive: true },
      select: { id: true },
    });

    return response.ok({
      type: link.type,
      bandName: link.band.name,
      bandId: link.bandId,
      sessionId: link.sessionId,
      alreadyMember: !!isMember,
    });
  } catch (err) {
    if (err instanceof Error && "statusCode" in err) throw err;
    return response.notFound("Invalid or expired invite link");
  }
});

// POST — Redeem the invite
export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  const code = params.code as string;

  // Peek at the link type first
  const link = await inviteService.resolveInviteLink(code);

  if (link.type === "band_invite") {
    const name = ctx.email.split("@")[0]; // fallback display name
    const result = await inviteService.redeemBandInvite(
      code,
      ctx.userId,
      ctx.email,
      name
    );
    return response.ok({
      bandId: result.bandId,
      alreadyMember: result.alreadyMember,
    });
  }

  if (link.type === "session_join") {
    const result = await inviteService.redeemSessionJoin(code, ctx.userId);
    return response.ok({
      bandId: result.bandId,
      sessionId: result.sessionId,
    });
  }

  return response.validationError("Unknown invite type");
});
