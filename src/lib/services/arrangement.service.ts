import { prisma } from "@/lib/prisma";
import {
  CreateArrangementInput,
  UpdateArrangementInput,
} from "@/lib/validators/arrangement";
import { NotFoundError, InvalidStateError } from "@/lib/api/errors";

export async function createArrangement(
  songId: string,
  memberId: string,
  data: CreateArrangementInput
) {
  return prisma.arrangement.create({
    data: {
      songId,
      name: data.name,
      versionLabel: data.versionLabel,
      createdByMemberId: memberId,
    },
  });
}

export async function getArrangement(arrangementId: string) {
  const arrangement = await prisma.arrangement.findUnique({
    where: { id: arrangementId },
    include: {
      parts: {
        orderBy: { displayOrder: "asc" },
        include: {
          sheetMusicAssets: {
            where: { isActive: true },
            select: {
              id: true,
              fileType: true,
              storageObject: {
                select: { objectKey: true, originalFileName: true },
              },
            },
          },
          assignments: {
            include: {
              member: { select: { id: true, displayName: true } },
            },
          },
        },
      },
      sheetMusicAssets: { where: { isActive: true } },
      audioAssets: {
        where: { isActive: true },
        include: {
          storageObject: {
            select: { objectKey: true, originalFileName: true },
          },
        },
      },
      assignments: {
        include: {
          member: { select: { id: true, displayName: true } },
          part: { select: { id: true, instrumentName: true, partName: true } },
        },
      },
      sectionMarkers: { orderBy: { sortOrder: "asc" } },
      song: { select: { id: true, title: true, bandId: true } },
    },
  });
  if (!arrangement) throw new NotFoundError("Arrangement", arrangementId);
  return arrangement;
}

export async function listArrangements(songId: string) {
  return prisma.arrangement.findMany({
    where: { songId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { parts: true, sheetMusicAssets: true, audioAssets: true } },
    },
  });
}

export async function updateArrangement(
  arrangementId: string,
  data: UpdateArrangementInput
) {
  const arrangement = await prisma.arrangement.findUnique({
    where: { id: arrangementId },
  });
  if (!arrangement) throw new NotFoundError("Arrangement", arrangementId);
  if (arrangement.isLocked) {
    throw new InvalidStateError("Cannot modify a locked arrangement");
  }
  if (arrangement.status !== "draft") {
    throw new InvalidStateError("Can only edit draft arrangements");
  }

  return prisma.arrangement.update({
    where: { id: arrangementId },
    data,
  });
}

export async function publishArrangement(arrangementId: string) {
  const arrangement = await prisma.arrangement.findUnique({
    where: { id: arrangementId },
    include: {
      parts: { where: { isRequired: true } },
      sheetMusicAssets: { where: { isActive: true } },
      audioAssets: { where: { isActive: true } },
    },
  });

  if (!arrangement) throw new NotFoundError("Arrangement", arrangementId);
  if (arrangement.status !== "draft") {
    throw new InvalidStateError("Only draft arrangements can be published");
  }

  return prisma.arrangement.update({
    where: { id: arrangementId },
    data: {
      status: "published",
      publishedAt: new Date(),
    },
  });
}

export async function archiveArrangement(arrangementId: string) {
  return prisma.arrangement.update({
    where: { id: arrangementId },
    data: { status: "archived" },
  });
}

export async function getReadiness(arrangementId: string) {
  const arrangement = await prisma.arrangement.findUnique({
    where: { id: arrangementId },
    include: {
      parts: { where: { isRequired: true } },
      sheetMusicAssets: { where: { isActive: true } },
      audioAssets: { where: { isActive: true } },
      syncMaps: { where: { isActive: true } },
    },
  });

  if (!arrangement) throw new NotFoundError("Arrangement", arrangementId);

  const requiredParts = arrangement.parts;
  const activeCharts = arrangement.sheetMusicAssets;
  const activeAudio = arrangement.audioAssets;
  const activeSyncMaps = arrangement.syncMaps;

  const partsWithCharts = new Set(activeCharts.map((c) => c.partId));
  const allRequiredPartsHaveCharts = requiredParts.every((p) =>
    partsWithCharts.has(p.id)
  );
  const hasBackingTrack = activeAudio.some(
    (a) => a.assetRole === "full_mix" || a.assetRole === "guide"
  );

  return {
    isReady:
      arrangement.status === "published" &&
      allRequiredPartsHaveCharts &&
      hasBackingTrack,
    checks: {
      published: arrangement.status === "published",
      requiredPartsAssigned: allRequiredPartsHaveCharts,
      activeChartsPresent: activeCharts.length > 0,
      activeBackingTrackPresent: hasBackingTrack,
      activeSyncMapPresent: activeSyncMaps.length > 0,
    },
  };
}
