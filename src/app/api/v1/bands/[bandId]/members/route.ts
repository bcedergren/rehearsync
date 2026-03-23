import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { inviteMemberSchema } from "@/lib/validators/band";
import * as bandService from "@/lib/services/band.service";
import { checkMemberLimit } from "@/lib/subscriptions/guards";
import { sendBandInviteEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

export const GET = withBandRole()(async (_req, ctx) => {
  const members = await bandService.listMembers(ctx.bandId);
  return response.ok(members);
});

export const POST = withBandRole("leader", "admin")(async (req: NextRequest, ctx) => {
  await checkMemberLimit(ctx.bandId, ctx.userId);

  const body = await req.json();
  const parsed = inviteMemberSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const member = await bandService.addMember(ctx.bandId, parsed.data);

  // Send invite email to the new member
  const [band, inviter] = await Promise.all([
    prisma.band.findUnique({ where: { id: ctx.bandId }, select: { name: true } }),
    prisma.member.findUnique({ where: { id: ctx.memberId }, select: { displayName: true } }),
  ]);

  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:5000";
  const loginUrl = `${appUrl}/login`;

  await sendBandInviteEmail(
    parsed.data.email,
    band?.name || "a band",
    inviter?.displayName || "Someone",
    loginUrl
  ).catch((err) => console.error("Failed to send invite email:", err));

  return response.created(member);
});
