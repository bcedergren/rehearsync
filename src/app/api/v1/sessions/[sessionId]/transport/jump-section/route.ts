import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { transportJumpSectionSchema } from "@/lib/validators/transport";
import * as transportService from "@/lib/services/transport.service";
import { prisma } from "@/lib/prisma";
import { requireFeature } from "@/lib/subscriptions/guards";

export const POST = withAuth(async (req: NextRequest, ctx, params) => {
  await requireFeature(ctx.userId, "allowTransportControls");

  const body = await req.json();
  const parsed = transportJumpSectionSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const member = await prisma.member.findFirst({
    where: { userId: ctx.userId, isActive: true },
  });
  if (!member) return response.forbidden("No active membership");

  const transport = await transportService.jumpToSection(
    params.sessionId,
    member.id,
    parsed.data.sectionMarkerId
  );
  return response.ok(transport);
});
