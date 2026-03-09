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
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxBands: 1,
    maxMembersPerBand: 2,
    maxSongsPerBand: 1,
    allowMusicXml: false,
    allowAudioUploads: false,
    allowSectionMarkers: false,
    allowMultipleArrangements: false,
    allowSessions: false,
    allowTransportControls: false,
    allowSyncMaps: false,
    allowAiProcessing: false,
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
