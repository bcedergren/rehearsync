import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CreateBandInput, UpdateBandInput, InviteMemberInput } from "@/lib/validators/band";
import { NotFoundError, ValidationError } from "@/lib/api/errors";

export async function createBand(userId: string, email: string, data: CreateBandInput) {
  return prisma.$transaction(async (tx) => {
    const band = await tx.band.create({ data: { name: data.name } });

    await tx.member.create({
      data: {
        bandId: band.id,
        userId,
        email,
        displayName: data.name,
        role: "leader",
      },
    });

    return band;
  });
}

export async function getBand(bandId: string) {
  const band = await prisma.band.findUnique({
    where: { id: bandId },
    include: { members: { where: { isActive: true } } },
  });
  if (!band) throw new NotFoundError("Band", bandId);
  return band;
}

export async function updateBand(bandId: string, data: UpdateBandInput) {
  return prisma.band.update({ where: { id: bandId }, data });
}

export async function listBandsForUser(userId: string) {
  return prisma.band.findMany({
    where: { members: { some: { userId, isActive: true } } },
    include: {
      members: { where: { isActive: true }, select: { id: true, displayName: true, role: true, defaultInstrument: true } },
      _count: { select: { songs: true } },
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function listMembers(bandId: string) {
  return prisma.member.findMany({
    where: { bandId, isActive: true },
    orderBy: { displayName: "asc" },
  });
}

export async function addMember(bandId: string, data: InviteMemberInput) {
  const existing = await prisma.member.findUnique({
    where: { bandId_email: { bandId, email: data.email } },
  });

  if (existing) {
    if (existing.isActive) {
      throw new ValidationError("A member with this email already exists in the band");
    }
    return prisma.member.update({
      where: { id: existing.id },
      data: { ...data, isActive: true },
    });
  }

  let user = await prisma.user.findUnique({ where: { email: data.email } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: data.email, name: data.displayName },
    });
  }

  return prisma.member.create({
    data: {
      bandId,
      userId: user.id,
      email: data.email,
      displayName: data.displayName,
      role: data.role,
      defaultInstrument: data.defaultInstrument,
    },
  });
}

export async function updateMemberRole(memberId: string, role: string) {
  return prisma.member.update({ where: { id: memberId }, data: { role } });
}

export async function updateMember(
  memberId: string,
  data: { displayName?: string; role?: string; defaultInstrument?: string | null }
) {
  return prisma.member.update({ where: { id: memberId }, data });
}

export async function deactivateMember(memberId: string) {
  return prisma.member.update({ where: { id: memberId }, data: { isActive: false } });
}
