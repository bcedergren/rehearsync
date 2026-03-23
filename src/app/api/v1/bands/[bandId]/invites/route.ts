import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { createInviteLinkSchema } from "@/lib/validators/invite";
import * as inviteService from "@/lib/services/invite.service";
import { sendBandInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

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

  // Send invite email if address provided
  console.log("[INVITE] parsed.data:", JSON.stringify(parsed.data));
  if (parsed.data.email) {
    const [band, member] = await Promise.all([
      prisma.band.findUnique({ where: { id: ctx.bandId }, select: { name: true } }),
      prisma.member.findUnique({ where: { id: ctx.memberId }, select: { displayName: true } }),
    ]);

    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const joinUrl = `${appUrl}/join/${link.code}`;

    await sendBandInviteEmail(
      parsed.data.email,
      band?.name || "a band",
      member?.displayName || "Someone",
      joinUrl
    ).catch((err) => console.error("Failed to send invite email:", err));
  }

  return response.created(link);
});
