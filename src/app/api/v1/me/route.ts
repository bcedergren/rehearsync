import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getTierLimits } from "@/lib/subscriptions/tiers";

export const GET = withAuth(async (_req, ctx) => {
  const user = await prisma.user.findUnique({
    where: { id: ctx.userId },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      subscribedAt: true,
      subscriptionEndsAt: true,
    },
  });

  const memberships = await prisma.member.findMany({
    where: { userId: ctx.userId, isActive: true },
    include: {
      band: { select: { id: true, name: true } },
    },
  });

  const limits = getTierLimits(user?.tier || "free");

  return response.ok({
    user,
    subscription: {
      tier: user?.tier || "free",
      limits,
      subscribedAt: user?.subscribedAt,
      subscriptionEndsAt: user?.subscriptionEndsAt,
    },
    memberships: memberships.map((m) => ({
      memberId: m.id,
      bandId: m.bandId,
      bandName: m.band.name,
      role: m.role,
      displayName: m.displayName,
      defaultInstrument: m.defaultInstrument,
    })),
  });
});
