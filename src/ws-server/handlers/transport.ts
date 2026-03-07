import { broadcast } from "../rooms";
import { WsEventType } from "../../types/ws-events";
import { v4 as uuidv4 } from "uuid";

export function broadcastTransportEvent(
  sessionId: string,
  eventType: string,
  payload: Record<string, unknown>
) {
  broadcast(sessionId, {
    type: eventType,
    sessionId,
    eventId: uuidv4(),
    serverTime: new Date().toISOString(),
    payload,
  });
}

export function broadcastPlay(
  sessionId: string,
  positionMs: number,
  audioAssetId?: string,
  syncMapId?: string,
  currentBar?: number
) {
  broadcastTransportEvent(sessionId, WsEventType.TRANSPORT_PLAY, {
    positionMs,
    startedAtServerTime: new Date().toISOString(),
    audioAssetId: audioAssetId || null,
    syncMapId: syncMapId || null,
    currentBar: currentBar || null,
  });
}

export function broadcastPause(
  sessionId: string,
  positionMs: number,
  currentBar?: number
) {
  broadcastTransportEvent(sessionId, WsEventType.TRANSPORT_PAUSE, {
    positionMs,
    currentBar: currentBar || null,
  });
}

export function broadcastStop(sessionId: string, positionMs: number) {
  broadcastTransportEvent(sessionId, WsEventType.TRANSPORT_STOP, {
    positionMs,
  });
}

export function broadcastSeek(
  sessionId: string,
  positionMs: number,
  currentBar?: number,
  sectionMarkerId?: string
) {
  broadcastTransportEvent(sessionId, WsEventType.TRANSPORT_SEEK, {
    positionMs,
    currentBar: currentBar || null,
    sectionMarkerId: sectionMarkerId || null,
  });
}
