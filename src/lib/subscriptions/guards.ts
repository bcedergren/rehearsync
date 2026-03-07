import { prisma } from "@/lib/prisma";
import { getTierLimits } from "./tiers";
import { AppError } from "@/lib/api/errors";

export class TierLimitError extends AppError {
  constructor(message: string, public requiredTier: string) {
    super("tier_limit", message, 403, { requiredTier });
  }
}

async function getUserTier(userId: string): Promise<string> {
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { tier: true },
  });
  return user.tier;
}

export async function checkBandLimit(userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxBands === Infinity) return;

  const count = await prisma.member.count({
    where: { userId, isActive: true, role: "leader" },
  });

  if (count >= limits.maxBands) {
    throw new TierLimitError(
      `Your ${tier} plan allows up to ${limits.maxBands} band(s). Upgrade to create more.`,
      tier === "free" ? "band" : "agent"
    );
  }
}

export async function checkMemberLimit(bandId: string, userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxMembersPerBand === Infinity) return;

  const count = await prisma.member.count({
    where: { bandId, isActive: true },
  });

  if (count >= limits.maxMembersPerBand) {
    throw new TierLimitError(
      `Your ${tier} plan allows up to ${limits.maxMembersPerBand} members per band. Upgrade to add more.`,
      tier === "free" ? "band" : "agent"
    );
  }
}

export async function checkSongLimit(bandId: string, userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxSongsPerBand === Infinity) return;

  const count = await prisma.song.count({
    where: { bandId },
  });

  if (count >= limits.maxSongsPerBand) {
    throw new TierLimitError(
      `Your ${tier} plan allows up to ${limits.maxSongsPerBand} song(s) per band. Upgrade to add more.`,
      "band"
    );
  }
}

export async function checkArrangementLimit(songId: string, userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.allowMultipleArrangements) return;

  const count = await prisma.arrangement.count({
    where: { songId },
  });

  if (count >= 1) {
    throw new TierLimitError(
      "Your free plan allows 1 arrangement per song. Upgrade to create more.",
      "band"
    );
  }
}

export async function requireFeature(
  userId: string,
  feature: keyof Pick<
    ReturnType<typeof getTierLimits>,
    | "allowMusicXml"
    | "allowAudioUploads"
    | "allowSectionMarkers"
    | "allowSessions"
    | "allowTransportControls"
    | "allowSyncMaps"
  >
): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits[feature]) return;

  const featureNames: Record<string, string> = {
    allowMusicXml: "MusicXML uploads",
    allowAudioUploads: "Audio uploads",
    allowSectionMarkers: "Section markers",
    allowSessions: "Live rehearsal sessions",
    allowTransportControls: "Transport controls",
    allowSyncMaps: "Sync map editor",
  };

  const requiredTier = feature.startsWith("allowSession") ||
    feature === "allowTransportControls" ||
    feature === "allowSyncMaps"
    ? "agent"
    : "band";

  throw new TierLimitError(
    `${featureNames[feature] || feature} requires a ${requiredTier} plan or higher.`,
    requiredTier
  );
}
