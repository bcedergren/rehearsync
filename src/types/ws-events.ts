export interface WsEnvelope<T = unknown> {
  type: string;
  sessionId: string;
  eventId: string;
  serverTime: string;
  payload: T;
}

// Server to Client payloads

export interface SessionStateChangedPayload {
  state: string;
  arrangementId: string;
}

export interface ParticipantJoinedPayload {
  memberId: string;
  displayName: string;
  partId: string | null;
  deviceType: string;
}

export interface ParticipantLeftPayload {
  memberId: string;
}

export interface ParticipantUpdatedPayload {
  memberId: string;
  connectionState: string;
  driftMs: number | null;
  loadedSheetMusicAssetId: string | null;
  loadedAudioAssetIds: string[];
}

export interface TransportPlayPayload {
  positionMs: number;
  startedAtServerTime: string;
  audioAssetId: string;
  syncMapId: string | null;
  currentBar: number | null;
}

export interface TransportPausePayload {
  positionMs: number;
  currentBar: number | null;
}

export interface TransportStopPayload {
  positionMs: number;
}

export interface TransportSeekPayload {
  positionMs: number;
  currentBar: number | null;
  sectionMarkerId: string | null;
}

export interface TransportCorrectPayload {
  targetPositionMs: number;
  currentBar: number | null;
  reason: string;
}

export interface AssetActivatedPayload {
  assetKind: "sheet_music" | "audio" | "sync_map";
  assetId: string;
  partId: string | null;
  effectiveMode: "immediate" | "next_stop" | "next_section";
}

export interface AssetUpdateAvailablePayload {
  assetKind: "sheet_music" | "audio" | "sync_map";
  partId: string | null;
  newAssetId: string;
}

// Client to Server payloads

export interface ParticipantReadyPayload {
  memberId: string;
  partId: string;
  loadedSheetMusicAssetId: string | null;
  loadedAudioAssetIds: string[];
}

export interface ParticipantHeartbeatPayload {
  memberId: string;
  connectionState: string;
  batteryLevel: number | null;
  networkRttMs: number | null;
}

export interface ParticipantDriftReportPayload {
  memberId: string;
  localPositionMs: number;
  estimatedDriftMs: number;
}

export interface ParticipantAssetLoadedPayload {
  assetKind: "sheet_music" | "audio";
  assetId: string;
}

export interface ParticipantAssetFailedPayload {
  assetKind: "sheet_music" | "audio";
  assetId: string;
  errorCode: string;
  message: string;
}

// Event type constants
export const WsEventType = {
  // Server to Client
  SESSION_STATE_CHANGED: "session.state_changed",
  PARTICIPANT_JOINED: "participant.joined",
  PARTICIPANT_LEFT: "participant.left",
  PARTICIPANT_UPDATED: "participant.updated",
  TRANSPORT_PLAY: "transport.play",
  TRANSPORT_PAUSE: "transport.pause",
  TRANSPORT_STOP: "transport.stop",
  TRANSPORT_SEEK: "transport.seek",
  TRANSPORT_CORRECT: "transport.correct",
  ASSET_ACTIVATED: "asset.activated",
  ASSET_UPDATE_AVAILABLE: "asset.update_available",
  // Client to Server
  PARTICIPANT_READY: "participant.ready",
  PARTICIPANT_HEARTBEAT: "participant.heartbeat",
  PARTICIPANT_DRIFT_REPORT: "participant.drift_report",
  PARTICIPANT_ASSET_LOADED: "participant.asset_loaded",
  PARTICIPANT_ASSET_FAILED: "participant.asset_failed",
} as const;
