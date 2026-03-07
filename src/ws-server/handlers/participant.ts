import type { WebSocket } from "ws";
import { broadcast } from "../rooms";
import { WsEventType } from "../../types/ws-events";
import { v4 as uuidv4 } from "uuid";

export function handleParticipantMessage(
  ws: WebSocket,
  sessionId: string,
  type: string,
  payload: Record<string, unknown>
) {
  switch (type) {
    case WsEventType.PARTICIPANT_READY:
      broadcast(sessionId, {
        type: WsEventType.PARTICIPANT_UPDATED,
        sessionId,
        eventId: uuidv4(),
        serverTime: new Date().toISOString(),
        payload: {
          memberId: payload.memberId,
          connectionState: "ready",
          driftMs: null,
          loadedSheetMusicAssetId: payload.loadedSheetMusicAssetId || null,
          loadedAudioAssetIds: payload.loadedAudioAssetIds || [],
        },
      });
      break;

    case WsEventType.PARTICIPANT_DRIFT_REPORT:
      // Could store drift info and trigger corrections
      broadcast(
        sessionId,
        {
          type: WsEventType.PARTICIPANT_UPDATED,
          sessionId,
          eventId: uuidv4(),
          serverTime: new Date().toISOString(),
          payload: {
            memberId: payload.memberId,
            connectionState: "ready",
            driftMs: payload.estimatedDriftMs,
            loadedSheetMusicAssetId: null,
            loadedAudioAssetIds: [],
          },
        },
        payload.memberId as string
      );
      break;

    case WsEventType.PARTICIPANT_HEARTBEAT:
      // Update last seen - handled server-side
      break;

    case WsEventType.PARTICIPANT_ASSET_LOADED:
    case WsEventType.PARTICIPANT_ASSET_FAILED:
      // Relay to leader
      broadcast(sessionId, {
        type,
        sessionId,
        eventId: uuidv4(),
        serverTime: new Date().toISOString(),
        payload,
      });
      break;
  }
}
