import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createInviteLinkSchema } from "@/lib/validators/invite";
import * as inviteService from "@/lib/services/invite.service";

export const GET = withBandRole("leader", "admin")(async (_req, ctx) => {
  const links = await inviteService.listInviteLinks(ctx.bandId, "band_invite");
  return response.ok(links);
});

export const POST = withBandRole("leader", "admin")(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const parsed = createInviteLinkSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const link = await inviteService.createBandInviteLink(
    ctx.bandId,
    ctx.memberId,
    {
      expiresInHours: parsed.data.expiresInHours,
      maxUses: parsed.data.maxUses,
    }
  );

  return response.created(link);
});
