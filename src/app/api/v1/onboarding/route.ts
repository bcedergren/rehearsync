import { NextRequest } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api/middleware";
import * as response from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { getTierLimits } from "@/lib/subscriptions/tiers";
import { sendBandInviteEmail } from "@/lib/email";
import { randomBytes } from "crypto";

const memberSchema = z.object({
  name: z.string().min(1).max(100),
  instrument: z.string().max(100).optional(),
  email: z.string().email().optional(),
});

const onboardingSchema = z.object({
  bandName: z.string().min(1).max(100),
  members: z.array(memberSchema).default([]),
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = await req.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return response.validationError("Invalid input", {
      issues: parsed.error.issues,
    });
  }

  const { bandName, members } = parsed.data;

  // Get user tier for limit enforcement
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.userId },
    select: { tier: true, name: true },
  });

  const limits = getTierLimits(user.tier);

  // Check band limit
  const bandCount = await prisma.member.count({
    where: { userId: ctx.userId, isActive: true, role: "leader" },
  });
  if (limits.maxBands !== Infinity && bandCount >= limits.maxBands) {
    return response.error("tier_limit", "Band limit reached for your plan", 403);
  }

  // Enforce member limit (leader + invited members)
  const totalMembers = 1 + members.length; // 1 for the leader
  if (limits.maxMembersPerBand !== Infinity && totalMembers > limits.maxMembersPerBand) {
    return response.error(
      "tier_limit",
      `Your plan allows up to ${limits.maxMembersPerBand} members per band`,
      403
    );
  }

  // Create band + leader in a transaction
  const band = await prisma.$transaction(async (tx) => {
    const band = await tx.band.create({ data: { name: bandName } });

    // Add the current user as leader
    await tx.member.create({
      data: {
        bandId: band.id,
        userId: ctx.userId,
        email: ctx.email,
        displayName: user.name || ctx.email.split("@")[0],
        role: "leader",
      },
    });

    return band;
  });

  // Process members: create invite links and optionally send emails
  const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const inviteResults: { name: string; email?: string; joinUrl: string }[] = [];

  for (const member of members) {
    const code = randomBytes(9).toString("base64url");
    await prisma.inviteLink.create({
      data: {
        bandId: band.id,
        code,
        type: "band_invite",
        createdByMemberId: (
          await prisma.member.findFirst({
            where: { bandId: band.id, userId: ctx.userId },
            select: { id: true },
          })
        )!.id,
        defaultRole: "musician",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        maxUses: 1,
      },
    });

    const joinUrl = `${appUrl}/join/${code}`;
    inviteResults.push({ name: member.name, email: member.email, joinUrl });

    // Send invite email if address provided
    if (member.email) {
      sendBandInviteEmail(
        member.email,
        bandName,
        user.name || "Your bandmate",
        joinUrl
      ).catch((err) => console.error("Failed to send invite email:", err));
    }
  }

  return response.created({
    bandId: band.id,
    bandName: band.name,
    invites: inviteResults,
  });
});
