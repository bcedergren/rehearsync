import type { WebSocket } from "ws";

interface Client {
  ws: WebSocket;
  memberId: string;
  sessionId: string;
}

const rooms = new Map<string, Map<string, Client>>();

export function joinRoom(sessionId: string, memberId: string, ws: WebSocket) {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, new Map());
  }
  rooms.get(sessionId)!.set(memberId, { ws, memberId, sessionId });
}

export function leaveRoom(sessionId: string, memberId: string) {
  const room = rooms.get(sessionId);
  if (room) {
    room.delete(memberId);
    if (room.size === 0) rooms.delete(sessionId);
  }
}

export function broadcast(sessionId: string, message: unknown, excludeMemberId?: string) {
  const room = rooms.get(sessionId);
  if (!room) return;

  const data = JSON.stringify(message);
  for (const [id, client] of room) {
    if (excludeMemberId && id === excludeMemberId) continue;
    if (client.ws.readyState === 1) {
      client.ws.send(data);
    }
  }
}

export function getRoomClients(sessionId: string): Client[] {
  const room = rooms.get(sessionId);
  return room ? Array.from(room.values()) : [];
}
