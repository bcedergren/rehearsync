import { NextRequest } from "next/server";
import { withBandRole } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { inviteMemberSchema } from "@/lib/validators/band";
import * as bandService from "@/lib/services/band.service";
import { checkMemberLimit } from "@/lib/subscriptions/guards";

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
  return response.created(member);
});
