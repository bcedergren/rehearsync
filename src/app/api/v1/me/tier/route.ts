import { NextRequest } from "next/server";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { isValidTier } from "@/lib/subscriptions/tiers";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim()).filter(Boolean);

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  if (!ADMIN_EMAILS.includes(ctx.email)) {
    return response.forbidden("Not authorized");
  }

  const body = await req.json();
  const { tier } = body;

  if (!tier || !isValidTier(tier)) {
    return response.validationError("Invalid tier. Must be: free, band, or agent");
  }

  const user = await prisma.user.update({
    where: { id: ctx.userId },
    data: { tier },
    select: { id: true, email: true, tier: true },
  });

  return response.ok(user);
});
