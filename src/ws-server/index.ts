import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { handleConnection } from "./handlers/connection";
import { handleParticipantMessage } from "./handlers/participant";

const PORT = parseInt(process.env.WS_PORT || "3001", 10);

const server = createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ws-server running" }));
});

const wss = new WebSocketServer({ server });

wss.on("connection", (ws: WebSocket, req) => {
  const url = new URL(req.url || "", `http://localhost:${PORT}`);
  const sessionId = url.searchParams.get("sessionId");
  const token = url.searchParams.get("token");

  if (!sessionId || !token) {
    ws.close(4001, "Missing sessionId or token");
    return;
  }

  // TODO: Verify JWT token against NEXTAUTH_SECRET
  // For now, extract memberId from token or use a placeholder
  const memberId = url.searchParams.get("memberId") || "unknown";
  const displayName = url.searchParams.get("displayName") || "Unknown";

  handleConnection(ws, sessionId, memberId, displayName);

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      if (msg.type && msg.payload) {
        handleParticipantMessage(ws, sessionId, msg.type, msg.payload);
      }
    } catch {
      // ignore malformed messages
    }
  });
});

server.listen(PORT, () => {
  console.log(`WebSocket server listening on port ${PORT}`);
});
