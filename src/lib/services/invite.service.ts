import { prisma } from "@/lib/prisma";
import { NotFoundError, ValidationError } from "@/lib/api/errors";
import { randomBytes } from "crypto";
import type { InviteLinkType } from "@/lib/validators/invite";

function generateCode(): string {
  return randomBytes(9).toString("base64url"); // 12 chars, URL-safe
}

export async function createBandInviteLink(
  bandId: string,
  memberId: string,
  options?: { expiresInHours?: number; maxUses?: number }
) {
  const expiresAt = options?.expiresInHours
    ? new Date(Date.now() + options.expiresInHours * 60 * 60 * 1000)
    : null;

  return prisma.inviteLink.create({
    data: {
      bandId,
      code: generateCode(),
      type: "band_invite" as InviteLinkType,
      createdByMemberId: memberId,
      expiresAt,
      maxUses: options?.maxUses ?? null,
    },
  });
}

export async function createSessionJoinLink(
  bandId: string,
  sessionId: string,
  memberId: string
) {
  // Reuse existing active link if one exists
  const existing = await prisma.inviteLink.findFirst({
    where: {
      sessionId,
      type: "session_join",
      isRevoked: false,
    },
  });
  if (existing) return existing;

  return prisma.inviteLink.create({
    data: {
      bandId,
      sessionId,
      code: generateCode(),
      type: "session_join" as InviteLinkType,
      createdByMemberId: memberId,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    },
  });
}

export async function resolveInviteLink(code: string) {
  const link = await prisma.inviteLink.findUnique({
    where: { code },
    include: {
      band: { select: { id: true, name: true } },
      session: { select: { id: true, state: true, bandId: true } },
    },
  });

  if (!link) throw new NotFoundError("InviteLink", code);
  if (link.isRevoked) throw new ValidationError("This invite link has been revoked");
  if (link.expiresAt && link.expiresAt < new Date()) {
    throw new ValidationError("This invite link has expired");
  }
  if (link.maxUses && link.useCount >= link.maxUses) {
    throw new ValidationError("This invite link has reached its usage limit");
  }
  if (link.type === "session_join" && link.session?.state === "ended") {
    throw new ValidationError("This session has ended");
  }

  return link;
}

export async function redeemBandInvite(
  code: string,
  userId: string,
  email: string,
  name: string
) {
  const link = await resolveInviteLink(code);

  if (link.type !== "band_invite") {
    throw new ValidationError("This is not a band invite link");
  }

  // Check if already a member
  const existing = await prisma.member.findFirst({
    where: { bandId: link.bandId, userId, isActive: true },
  });

  if (existing) {
    return { member: existing, alreadyMember: true, bandId: link.bandId };
  }

  // Check for inactive membership (re-join)
  const inactive = await prisma.member.findFirst({
    where: { bandId: link.bandId, userId, isActive: false },
  });

  let member;
  if (inactive) {
    member = await prisma.member.update({
      where: { id: inactive.id },
      data: {
        isActive: true,
        role: link.defaultRole,
        displayName: name,
      },
    });
  } else {
    member = await prisma.member.create({
      data: {
        bandId: link.bandId,
        userId,
        email,
        displayName: name,
        role: link.defaultRole,
      },
    });
  }

  // Increment use count atomically
  await prisma.inviteLink.updateMany({
    where: { id: link.id, useCount: link.useCount },
    data: { useCount: link.useCount + 1 },
  });

  return { member, alreadyMember: false, bandId: link.bandId };
}

export async function redeemSessionJoin(code: string, userId: string) {
  const link = await resolveInviteLink(code);

  if (link.type !== "session_join") {
    throw new ValidationError("This is not a session join link");
  }

  // User must be a band member
  const member = await prisma.member.findFirst({
    where: { bandId: link.bandId, userId, isActive: true },
  });

  if (!member) {
    throw new ValidationError(
      "You must be a member of this band to join the session"
    );
  }

  // Increment use count
  await prisma.inviteLink.updateMany({
    where: { id: link.id, useCount: link.useCount },
    data: { useCount: link.useCount + 1 },
  });

  return {
    bandId: link.bandId,
    sessionId: link.sessionId!,
    memberId: member.id,
  };
}

export async function revokeInviteLink(linkId: string) {
  return prisma.inviteLink.update({
    where: { id: linkId },
    data: { isRevoked: true },
  });
}

export async function listInviteLinks(bandId: string, type?: InviteLinkType) {
  return prisma.inviteLink.findMany({
    where: {
      bandId,
      isRevoked: false,
      ...(type && { type }),
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      code: true,
      type: true,
      defaultRole: true,
      expiresAt: true,
      maxUses: true,
      useCount: true,
      createdAt: true,
      session: { select: { id: true, state: true } },
    },
  });
}
