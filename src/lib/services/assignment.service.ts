import { prisma } from "@/lib/prisma";
import { AssignmentInput } from "@/lib/validators/session";

export async function createOrUpdateAssignment(
  arrangementId: string,
  data: AssignmentInput
) {
  return prisma.arrangementMemberAssignment.upsert({
    where: {
      arrangementId_memberId: {
        arrangementId,
        memberId: data.memberId,
      },
    },
    create: {
      arrangementId,
      memberId: data.memberId,
      partId: data.partId,
      isDefault: data.isDefault,
    },
    update: {
      partId: data.partId,
      isDefault: data.isDefault,
    },
    include: {
      member: { select: { id: true, displayName: true } },
      part: { select: { id: true, instrumentName: true, partName: true } },
    },
  });
}

export async function listAssignments(arrangementId: string) {
  return prisma.arrangementMemberAssignment.findMany({
    where: { arrangementId },
    include: {
      member: { select: { id: true, displayName: true, defaultInstrument: true } },
      part: { select: { id: true, instrumentName: true, partName: true } },
    },
  });
}

export async function deleteAssignment(assignmentId: string) {
  return prisma.arrangementMemberAssignment.delete({
    where: { id: assignmentId },
  });
}
