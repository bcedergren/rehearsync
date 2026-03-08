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
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    maxBands: 1,
    maxMembersPerBand: 5,
    maxSongsPerBand: 3,
    allowMusicXml: true,
    allowAudioUploads: true,
    allowSectionMarkers: true,
    allowMultipleArrangements: false,
    allowSessions: false,
    allowTransportControls: false,
    allowSyncMaps: true,
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
