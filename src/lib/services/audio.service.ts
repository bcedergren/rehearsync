import { prisma } from "@/lib/prisma";
import { CreateAudioAssetInput } from "@/lib/validators/upload";
import { NotFoundError } from "@/lib/api/errors";

export async function createAudioAsset(
  arrangementId: string,
  data: CreateAudioAssetInput
) {
  const maxVersion = await prisma.audioAsset.aggregate({
    where: {
      arrangementId,
      assetRole: data.assetRole,
      stemName: data.stemName ?? null,
    },
    _max: { versionNum: true },
  });

  const nextVersion = (maxVersion._max.versionNum ?? 0) + 1;

  // Retire any existing active asset for the same role+stem, then create the new one as active
  const [, asset] = await prisma.$transaction([
    prisma.audioAsset.updateMany({
      where: {
        arrangementId,
        assetRole: data.assetRole,
        stemName: data.stemName ?? null,
        isActive: true,
      },
      data: { isActive: false, status: "retired" },
    }),
    prisma.audioAsset.create({
      data: {
        arrangementId,
        storageObjectId: data.storageObjectId,
        assetRole: data.assetRole,
        stemName: data.stemName,
        channelMode: data.channelMode,
        durationMs: data.durationMs,
        sampleRateHz: data.sampleRateHz,
        versionNum: nextVersion,
        isActive: true,
        status: "active",
        notes: data.notes,
      },
    }),
  ]);

  return asset;
}

export async function listAudioAssets(arrangementId: string) {
  return prisma.audioAsset.findMany({
    where: { arrangementId },
    orderBy: [{ assetRole: "asc" }, { versionNum: "desc" }],
    include: {
      storageObject: {
        select: { objectKey: true, originalFileName: true, mimeType: true, sizeBytes: true },
      },
    },
  });
}

export async function activateAudioAsset(assetId: string) {
  const asset = await prisma.audioAsset.findUnique({
    where: { id: assetId },
  });
  if (!asset) throw new NotFoundError("AudioAsset", assetId);

  await prisma.$transaction([
    prisma.audioAsset.updateMany({
      where: {
        arrangementId: asset.arrangementId,
        assetRole: asset.assetRole,
        stemName: asset.stemName,
        isActive: true,
      },
      data: { isActive: false, status: "retired" },
    }),
    prisma.audioAsset.update({
      where: { id: assetId },
      data: { isActive: true, status: "active" },
    }),
  ]);

  return prisma.audioAsset.findUnique({ where: { id: assetId } });
}

export async function retireAudioAsset(assetId: string) {
  return prisma.audioAsset.update({
    where: { id: assetId },
    data: { isActive: false, status: "retired" },
  });
}
