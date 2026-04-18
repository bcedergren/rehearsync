import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getTierLimits } from "@/lib/subscriptions/tiers";
import { BadRequestError } from "@/lib/api/errors";

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

export const PATCH = withAuth(async (req, ctx) => {
  const body = await req.json();
  const { name } = body;

  if (!name || typeof name !== "string" || !name.trim()) {
    throw new BadRequestError("Name is required");
  }

  const updatedUser = await prisma.user.update({
    where: { id: ctx.userId },
    data: { name: name.trim() },
    select: {
      id: true,
      name: true,
      email: true,
      tier: true,
      subscribedAt: true,
      subscriptionEndsAt: true,
    },
  });

  return response.ok({ user: updatedUser });
});
