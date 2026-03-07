import { prisma } from "@/lib/prisma";
import {
  CreateSyncMapInput,
  AddSyncMapPointsInput,
} from "@/lib/validators/session";
import { NotFoundError } from "@/lib/api/errors";

export async function createSyncMap(
  audioAssetId: string,
  memberId: string,
  data: CreateSyncMapInput
) {
  const audioAsset = await prisma.audioAsset.findUnique({
    where: { id: audioAssetId },
  });
  if (!audioAsset) throw new NotFoundError("AudioAsset", audioAssetId);

  const maxVersion = await prisma.syncMap.aggregate({
    where: { audioAssetId },
    _max: { versionNum: true },
  });
  const nextVersion = (maxVersion._max.versionNum ?? 0) + 1;

  return prisma.syncMap.create({
    data: {
      arrangementId: audioAsset.arrangementId,
      audioAssetId,
      sourceType: data.sourceType,
      versionNum: nextVersion,
      createdByMemberId: memberId,
    },
  });
}

export async function addSyncMapPoints(
  syncMapId: string,
  data: AddSyncMapPointsInput
) {
  return prisma.syncMapPoint.createMany({
    data: data.points.map((p) => ({
      syncMapId,
      timeMs: p.timeMs,
      barNumber: p.barNumber,
      beatNumber: p.beatNumber,
      tickOffset: p.tickOffset,
    })),
  });
}

export async function listSyncMaps(audioAssetId: string) {
  return prisma.syncMap.findMany({
    where: { audioAssetId },
    orderBy: { versionNum: "desc" },
    include: {
      _count: { select: { points: true } },
    },
  });
}

export async function getSyncMapWithPoints(syncMapId: string) {
  const syncMap = await prisma.syncMap.findUnique({
    where: { id: syncMapId },
    include: {
      points: { orderBy: { barNumber: "asc" } },
    },
  });
  if (!syncMap) throw new NotFoundError("SyncMap", syncMapId);
  return syncMap;
}

export async function activateSyncMap(syncMapId: string) {
  const syncMap = await prisma.syncMap.findUnique({
    where: { id: syncMapId },
  });
  if (!syncMap) throw new NotFoundError("SyncMap", syncMapId);

  await prisma.$transaction([
    prisma.syncMap.updateMany({
      where: { audioAssetId: syncMap.audioAssetId, isActive: true },
      data: { isActive: false, status: "retired" },
    }),
    prisma.syncMap.update({
      where: { id: syncMapId },
      data: { isActive: true, status: "active" },
    }),
  ]);

  return prisma.syncMap.findUnique({ where: { id: syncMapId } });
}

export async function deleteSyncMapPoint(pointId: string) {
  return prisma.syncMapPoint.delete({ where: { id: pointId } });
}
