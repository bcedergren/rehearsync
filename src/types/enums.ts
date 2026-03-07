export const MemberRole = {
  LEADER: "leader",
  ADMIN: "admin",
  MUSICIAN: "musician",
} as const;
export type MemberRole = (typeof MemberRole)[keyof typeof MemberRole];

export const ArrangementStatus = {
  DRAFT: "draft",
  PUBLISHED: "published",
  ARCHIVED: "archived",
} as const;
export type ArrangementStatus =
  (typeof ArrangementStatus)[keyof typeof ArrangementStatus];

export const SheetMusicFileType = {
  MUSICXML: "musicxml",
  PDF: "pdf",
} as const;
export type SheetMusicFileType =
  (typeof SheetMusicFileType)[keyof typeof SheetMusicFileType];

export const AudioAssetRole = {
  FULL_MIX: "full_mix",
  STEM: "stem",
  CLICK: "click",
  GUIDE: "guide",
} as const;
export type AudioAssetRole =
  (typeof AudioAssetRole)[keyof typeof AudioAssetRole];

export const ChannelMode = {
  MONO: "mono",
  STEREO: "stereo",
} as const;
export type ChannelMode = (typeof ChannelMode)[keyof typeof ChannelMode];

export const AssetStatus = {
  DRAFT: "draft",
  ACTIVE: "active",
  RETIRED: "retired",
} as const;
export type AssetStatus = (typeof AssetStatus)[keyof typeof AssetStatus];

export const SyncMapSourceType = {
  MANUAL: "manual",
  IMPORTED: "imported",
  GENERATED: "generated",
} as const;
export type SyncMapSourceType =
  (typeof SyncMapSourceType)[keyof typeof SyncMapSourceType];

export const SessionState = {
  DRAFT: "draft",
  READY: "ready",
  LIVE: "live",
  PAUSED: "paused",
  ENDED: "ended",
} as const;
export type SessionState = (typeof SessionState)[keyof typeof SessionState];

export const DeviceType = {
  IPAD: "ipad",
  ANDROID_TABLET: "android_tablet",
  LAPTOP: "laptop",
  PHONE: "phone",
  DESKTOP: "desktop",
  UNKNOWN: "unknown",
} as const;
export type DeviceType = (typeof DeviceType)[keyof typeof DeviceType];

export const ConnectionState = {
  CONNECTING: "connecting",
  READY: "ready",
  DISCONNECTED: "disconnected",
} as const;
export type ConnectionState =
  (typeof ConnectionState)[keyof typeof ConnectionState];

export const TransportStatus = {
  STOPPED: "stopped",
  PLAYING: "playing",
  PAUSED: "paused",
  SEEKING: "seeking",
} as const;
export type TransportStatus =
  (typeof TransportStatus)[keyof typeof TransportStatus];

export const TransportEventType = {
  PLAY: "play",
  PAUSE: "pause",
  STOP: "stop",
  SEEK: "seek",
  JUMP_SECTION: "jump_section",
  ACTIVATE_SHEET: "activate_sheet",
  ACTIVATE_AUDIO: "activate_audio",
} as const;
export type TransportEventType =
  (typeof TransportEventType)[keyof typeof TransportEventType];

export const EffectiveMode = {
  IMMEDIATE: "immediate",
  NEXT_STOP: "next_stop",
  NEXT_SECTION: "next_section",
} as const;
export type EffectiveMode =
  (typeof EffectiveMode)[keyof typeof EffectiveMode];
