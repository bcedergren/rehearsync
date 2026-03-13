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

export async function checkAudioUploadLimit(userId: string): Promise<void> {
  const tier = await getUserTier(userId);
  const limits = getTierLimits(tier);

  if (limits.maxAudioUploads === Infinity) return;

  // Count active full-mix audio across all the user's bands
  const count = await prisma.audioAsset.count({
    where: {
      assetRole: "full_mix",
      isActive: true,
      arrangement: {
        song: {
          band: {
            members: {
              some: { userId, isActive: true },
            },
          },
        },
      },
    },
  });

  if (count >= limits.maxAudioUploads) {
    throw new TierLimitError(
      `Your ${tier} plan allows up to ${limits.maxAudioUploads} audio upload(s). Upgrade to upload more.`,
      "band"
    );
  }
}

/**
 * Blocks mutations for free-tier users once a full_mix audio upload exists
 * anywhere on their account. The scope parameter is accepted for API
 * compatibility but the check is account-wide.
 */
export async function checkFreeTierLock(
  userId: string,
  _scope:
    | { songId: string }
    | { arrangementId: string }
    | { partId: string }
    | { sectionMarkerId: string }
    | { syncMapId: string }
): Promise<void> {
  const tier = await getUserTier(userId);
  if (tier !== "free") return;

  const userBandFilter = {
    song: {
      band: {
        members: {
          some: { userId, isActive: true },
        },
      },
    },
  };

  // Account-wide check: any active full_mix audio across all the user's bands
  const hasAudio = await prisma.audioAsset.count({
    where: {
      assetRole: "full_mix",
      isActive: true,
      arrangement: userBandFilter,
    },
  });

  if (hasAudio === 0) return;

  // Allow mutations while processing is in progress or recently finished (setup phase).
  // This covers the post-processing window where section generation and
  // assignment review still need to run from the frontend.
  const SETUP_GRACE_MS = 10 * 60 * 1000; // 10 minutes
  const graceThreshold = new Date(Date.now() - SETUP_GRACE_MS);

  const recentOrActiveJobs = await prisma.processingJob.count({
    where: {
      arrangement: userBandFilter,
      OR: [
        { status: { in: ["pending", "running"] } },
        { status: "completed", completedAt: { gte: graceThreshold } },
      ],
    },
  });

  if (recentOrActiveJobs > 0) return;

  throw new TierLimitError(
    "Free plan songs are locked after audio upload. Upgrade to the Band plan to make changes.",
    "band"
  );
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
    | "allowAiProcessing"
    | "allowPracticeTools"
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
    allowAiProcessing: "AI audio processing",
    allowPracticeTools: "Practice tools (tempo & key)",
  };

  const agentOnlyFeatures = [
    "allowSessions",
    "allowTransportControls",
    "allowSyncMaps",
  ];
  const requiredTier = agentOnlyFeatures.includes(feature) ? "agent" : "band";

  throw new TierLimitError(
    `${featureNames[feature] || feature} requires a ${requiredTier} plan or higher.`,
    requiredTier
  );
}
