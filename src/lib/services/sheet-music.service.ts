import { prisma } from "@/lib/prisma";
import { CreateSheetMusicAssetInput } from "@/lib/validators/upload";
import { NotFoundError } from "@/lib/api/errors";

export async function createSheetMusicAsset(
  arrangementId: string,
  data: CreateSheetMusicAssetInput
) {
  const maxVersion = await prisma.sheetMusicAsset.aggregate({
    where: {
      partId: data.partId,
      fileType: data.fileType,
    },
    _max: { versionNum: true },
  });

  const nextVersion = (maxVersion._max.versionNum ?? 0) + 1;

  // Retire any existing active asset for the same part+fileType, then create the new one as active
  const [, asset] = await prisma.$transaction([
    prisma.sheetMusicAsset.updateMany({
      where: {
        partId: data.partId,
        fileType: data.fileType,
        isActive: true,
      },
      data: { isActive: false, status: "retired" },
    }),
    prisma.sheetMusicAsset.create({
      data: {
        arrangementId,
        partId: data.partId,
        storageObjectId: data.storageObjectId,
        fileType: data.fileType,
        versionNum: nextVersion,
        isActive: true,
        status: "active",
        notes: data.notes,
      },
    }),
  ]);

  return asset;
}

export async function listSheetMusicAssets(arrangementId: string) {
  return prisma.sheetMusicAsset.findMany({
    where: { arrangementId },
    orderBy: [{ partId: "asc" }, { versionNum: "desc" }],
    include: {
      part: { select: { id: true, instrumentName: true, partName: true } },
      storageObject: {
        select: { originalFileName: true, mimeType: true, sizeBytes: true },
      },
    },
  });
}

export async function activateSheetMusicAsset(assetId: string) {
  const asset = await prisma.sheetMusicAsset.findUnique({
    where: { id: assetId },
  });
  if (!asset) throw new NotFoundError("SheetMusicAsset", assetId);

  await prisma.$transaction([
    prisma.sheetMusicAsset.updateMany({
      where: {
        partId: asset.partId,
        fileType: asset.fileType,
        isActive: true,
      },
      data: { isActive: false, status: "retired" },
    }),
    prisma.sheetMusicAsset.update({
      where: { id: assetId },
      data: { isActive: true, status: "active" },
    }),
  ]);

  return prisma.sheetMusicAsset.findUnique({ where: { id: assetId } });
}

export async function retireSheetMusicAsset(assetId: string) {
  return prisma.sheetMusicAsset.update({
    where: { id: assetId },
    data: { isActive: false, status: "retired" },
  });
}
