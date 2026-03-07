"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useSessionStore } from "@/stores/session.store";
import { WsEventType } from "@/types/ws-events";

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";
const HEARTBEAT_INTERVAL = 5000;
const RECONNECT_DELAY = 2000;
const MAX_RECONNECT_ATTEMPTS = 10;

interface UseWebSocketOptions {
  sessionId: string;
  memberId: string;
  token: string;
}

export function useWebSocket({ sessionId, memberId, token }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const reconnectAttempts = useRef(0);
  const [isConnected, setIsConnected] = useState(false);

  const store = useSessionStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(`${WS_URL}?sessionId=${sessionId}&token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      store.setConnected(true);
      reconnectAttempts.current = 0;

      // Start heartbeat
      heartbeatRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(
            JSON.stringify({
              type: WsEventType.PARTICIPANT_HEARTBEAT,
              payload: {
                memberId,
                connectionState: "ready",
              },
            })
          );
        }
      }, HEARTBEAT_INTERVAL);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        handleMessage(msg);
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      store.setConnected(false);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);

      if (reconnectAttempts.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts.current++;
        setTimeout(connect, RECONNECT_DELAY);
      }
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId, memberId, token, store]);

  function handleMessage(msg: { type: string; payload: Record<string, unknown> }) {
    switch (msg.type) {
      case WsEventType.TRANSPORT_PLAY:
        store.setTransport({
          status: "playing",
          positionMs: msg.payload.positionMs as number,
          currentBar: (msg.payload.currentBar as number) || null,
          startedAtServerTime: msg.payload.startedAtServerTime as string,
        });
        break;
      case WsEventType.TRANSPORT_PAUSE:
        store.setTransport({
          status: "paused",
          positionMs: msg.payload.positionMs as number,
          currentBar: (msg.payload.currentBar as number) || null,
          startedAtServerTime: null,
        });
        break;
      case WsEventType.TRANSPORT_STOP:
        store.setTransport({
          status: "stopped",
          positionMs: msg.payload.positionMs as number,
          currentBar: null,
          startedAtServerTime: null,
        });
        break;
      case WsEventType.TRANSPORT_SEEK:
        store.setTransport({
          positionMs: msg.payload.positionMs as number,
          currentBar: (msg.payload.currentBar as number) || null,
        });
        break;
      case WsEventType.PARTICIPANT_JOINED:
        store.addParticipant({
          memberId: msg.payload.memberId as string,
          displayName: msg.payload.displayName as string,
          partId: (msg.payload.partId as string) || null,
          deviceType: msg.payload.deviceType as string,
          connectionState: "ready",
          driftMs: null,
        });
        break;
      case WsEventType.PARTICIPANT_LEFT:
        store.removeParticipant(msg.payload.memberId as string);
        break;
      case WsEventType.SESSION_STATE_CHANGED:
        store.setSession(sessionId, msg.payload.state as string);
        break;
    }
  }

  const send = useCallback(
    (type: string, payload: Record<string, unknown>) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type, payload }));
      }
    },
    []
  );

  const disconnect = useCallback(() => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    wsRef.current?.close();
    wsRef.current = null;
  }, []);

  useEffect(() => {
    connect();
    return disconnect;
  }, [connect, disconnect]);

  return { isConnected, send, disconnect };
}
