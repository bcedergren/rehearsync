export type Tier = "free" | "band" | "agent";

export interface TierLimits {
  maxBands: number;
  maxMembersPerBand: number;
  maxSongsPerBand: number;
  allowMusicXml: boolean;
  allowAudioUploads: boolean;
  allowSectionMarkers: boolean;
  allowMultipleArrangements: boolean;
  allowSessions: boolean;
  allowTransportControls: boolean;
  allowSyncMaps: boolean;
  allowAiProcessing: boolean;
  allowPracticeTools: boolean;
  maxAudioUploads: number;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxBands: 1,
    maxMembersPerBand: 2,
    maxSongsPerBand: 1,
    allowMusicXml: false,
    allowAudioUploads: true,
    allowSectionMarkers: true,
    allowMultipleArrangements: false,
    allowSessions: false,
    allowTransportControls: false,
    allowSyncMaps: false,
    allowAiProcessing: true,
    allowPracticeTools: false,
    maxAudioUploads: 1,
  },
  band: {
    maxBands: 1,
    maxMembersPerBand: 15,
    maxSongsPerBand: Infinity,
    allowMusicXml: true,
    allowAudioUploads: true,
    allowSectionMarkers: true,
    allowMultipleArrangements: true,
    allowSessions: false,
    allowTransportControls: false,
    allowSyncMaps: false,
    allowAiProcessing: true,
    allowPracticeTools: true,
    maxAudioUploads: Infinity,
  },
  agent: {
    maxBands: Infinity,
    maxMembersPerBand: Infinity,
    maxSongsPerBand: Infinity,
    allowMusicXml: true,
    allowAudioUploads: true,
    allowSectionMarkers: true,
    allowMultipleArrangements: true,
    allowSessions: true,
    allowTransportControls: true,
    allowSyncMaps: true,
    allowAiProcessing: true,
    allowPracticeTools: true,
    maxAudioUploads: Infinity,
  },
};

export function getTierLimits(tier: string): TierLimits {
  if (tier in TIER_LIMITS) {
    return TIER_LIMITS[tier as Tier];
  }
  return TIER_LIMITS.free;
}

export function isValidTier(tier: string): tier is Tier {
  return tier === "free" || tier === "band" || tier === "agent";
}
