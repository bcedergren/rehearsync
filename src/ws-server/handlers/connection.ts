import type { WebSocket } from "ws";
import { joinRoom, leaveRoom, broadcast } from "../rooms";
import { WsEventType } from "../../types/ws-events";
import { v4 as uuidv4 } from "uuid";

export function handleConnection(
  ws: WebSocket,
  sessionId: string,
  memberId: string,
  displayName: string
) {
  joinRoom(sessionId, memberId, ws);

  // Notify others
  broadcast(
    sessionId,
    {
      type: WsEventType.PARTICIPANT_JOINED,
      sessionId,
      eventId: uuidv4(),
      serverTime: new Date().toISOString(),
      payload: {
        memberId,
        displayName,
        partId: null,
        deviceType: "unknown",
      },
    },
    memberId
  );

  ws.on("close", () => {
    leaveRoom(sessionId, memberId);
    broadcast(sessionId, {
      type: WsEventType.PARTICIPANT_LEFT,
      sessionId,
      eventId: uuidv4(),
      serverTime: new Date().toISOString(),
      payload: { memberId },
    });
  });
}
