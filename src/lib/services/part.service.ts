import { prisma } from "@/lib/prisma";
import { CreatePartInput, UpdatePartInput } from "@/lib/validators/part";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

export async function createPart(
  arrangementId: string,
  data: CreatePartInput
) {
  return prisma.part.create({
    data: {
      arrangementId,
      instrumentName: data.instrumentName,
      partName: data.partName,
      transposition: data.transposition,
      displayOrder: data.displayOrder,
      isRequired: data.isRequired,
    },
  });
}

export async function listParts(arrangementId: string) {
  return prisma.part.findMany({
    where: { arrangementId },
    orderBy: { displayOrder: "asc" },
    include: {
      sheetMusicAssets: { where: { isActive: true } },
      assignments: {
        include: {
          member: { select: { id: true, displayName: true } },
        },
      },
    },
  });
}

export async function updatePart(partId: string, data: UpdatePartInput) {
  return prisma.part.update({ where: { id: partId }, data });
}

export async function deletePart(partId: string) {
  const part = await prisma.part.findUnique({
    where: { id: partId },
    include: {
      _count: {
        select: { sheetMusicAssets: true, assignments: true },
      },
    },
  });
  if (!part) throw new NotFoundError("Part", partId);

  if (part._count.sheetMusicAssets > 0 || part._count.assignments > 0) {
    throw new InvalidStateError(
      "Cannot delete a part that has active assets or assignments"
    );
  }

  return prisma.part.delete({ where: { id: partId } });
}
