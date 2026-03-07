import { prisma } from "@/lib/prisma";
import {
  CreateSectionMarkerInput,
  UpdateSectionMarkerInput,
} from "@/lib/validators/session";

export async function createSectionMarker(
  arrangementId: string,
  data: CreateSectionMarkerInput
) {
  return prisma.sectionMarker.create({
    data: {
      arrangementId,
      name: data.name,
      startBar: data.startBar,
      endBar: data.endBar,
      sortOrder: data.sortOrder,
    },
  });
}

export async function listSectionMarkers(arrangementId: string) {
  return prisma.sectionMarker.findMany({
    where: { arrangementId },
    orderBy: { sortOrder: "asc" },
  });
}

export async function updateSectionMarker(
  markerId: string,
  data: UpdateSectionMarkerInput
) {
  return prisma.sectionMarker.update({
    where: { id: markerId },
    data,
  });
}

export async function deleteSectionMarker(markerId: string) {
  return prisma.sectionMarker.delete({ where: { id: markerId } });
}
