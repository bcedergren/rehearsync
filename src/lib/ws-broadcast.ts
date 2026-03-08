import { v4 as uuidv4 } from "uuid";
import { WsEventType } from "@/types/ws-events";

const WS_INTERNAL_URL = `http://localhost:${process.env.WS_PORT || 3001}`;

async function broadcastToSession(
  sessionId: string,
  type: string,
  payload: Record<string, unknown>
) {
  const message = {
    type,
    sessionId,
    eventId: uuidv4(),
    serverTime: new Date().toISOString(),
    payload,
  };

  try {
    await fetch(`${WS_INTERNAL_URL}/broadcast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, message }),
    });
  } catch {
    // WS server may not be running - silently ignore
  }
}

export async function broadcastPlay(
  sessionId: string,
  positionMs: number,
  opts?: { currentBar?: number; audioAssetId?: string; syncMapId?: string }
) {
  await broadcastToSession(sessionId, WsEventType.TRANSPORT_PLAY, {
    positionMs,
    startedAtServerTime: new Date().toISOString(),
    audioAssetId: opts?.audioAssetId || null,
    syncMapId: opts?.syncMapId || null,
    currentBar: opts?.currentBar || null,
  });
}

export async function broadcastPause(
  sessionId: string,
  positionMs: number,
  currentBar?: number
) {
  await broadcastToSession(sessionId, WsEventType.TRANSPORT_PAUSE, {
    positionMs,
    currentBar: currentBar || null,
  });
}

export async function broadcastStop(sessionId: string, positionMs: number) {
  await broadcastToSession(sessionId, WsEventType.TRANSPORT_STOP, {
    positionMs,
  });
}

export async function broadcastSeek(
  sessionId: string,
  positionMs: number,
  opts?: { currentBar?: number; sectionMarkerId?: string }
) {
  await broadcastToSession(sessionId, WsEventType.TRANSPORT_SEEK, {
    positionMs,
    currentBar: opts?.currentBar || null,
    sectionMarkerId: opts?.sectionMarkerId || null,
  });
}

export async function broadcastSessionState(
  sessionId: string,
  state: string,
  arrangementId: string
) {
  await broadcastToSession(sessionId, WsEventType.SESSION_STATE_CHANGED, {
    state,
    arrangementId,
  });
}
