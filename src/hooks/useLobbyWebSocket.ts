import { useEffect, useRef, useCallback, useState } from "react";
import type { LobbyUser } from "@/types/lobby";

interface WebSocketMessage {
  action:
    | "ban"
    | "pick"
    | "submit_result"
    | "update_team"
    | "update_ready"
    | "start_draft";
  userId?: string;
  teamData?: {
    team: "BLUE" | "RED" | "SPECTATOR";
    position: number;
  };
  isReady?: boolean;
}

interface UseLobbyWebSocketProps {
  gameCode: string;
  isSpectator?: boolean;
  onStatusUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useLobbyWebSocket({
  gameCode,
  isSpectator = false,
  onStatusUpdate,
  onError,
}: UseLobbyWebSocketProps) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connecting" | "connected" | "disconnected"
  >("disconnected");
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const isComponentMounted = useRef(true);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 1000; // 1초로 단축
  const CONNECTION_TIMEOUT = 5000; // 5초 연결 타임아웃

  const cleanupWebSocket = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      // 이벤트 리스너 제거
      wsRef.current.onopen = null;
      wsRef.current.onclose = null;
      wsRef.current.onerror = null;
      wsRef.current.onmessage = null;

      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.close(1000, "Normal closure");
      }
      wsRef.current = null;
    }
  }, []);

  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve) => {
      if (!gameCode || !isComponentMounted.current) {
        resolve(false);
        return;
      }

      const ws = new WebSocket(
        `ws://localhost:8000/ws/draft?id=${gameCode}&spectator=${isSpectator}`
      );
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected Successfully");
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        resolve(true);
      };

      ws.onerror = () => {
        console.error("WebSocket connection failed");
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        wsRef.current = null;
        resolve(false);
      };

      ws.onclose = (event) => {
        if (!isComponentMounted.current) return;

        console.log(
          `WebSocket Closed: ${event.code} - ${event.reason || "No reason"}`
        );
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        wsRef.current = null;
        resolve(false);
      };

      // 타임아웃 설정
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          resolve(false);
        }
      }, CONNECTION_TIMEOUT);
    });
  }, [gameCode, isSpectator]);

  const connect = useCallback(() => {
    if (isConnectingRef.current) return;
    isConnectingRef.current = true;
    ensureConnection();
  }, [ensureConnection]);

  const sendMessage = useCallback(
    async (message: WebSocketMessage): Promise<boolean> => {
      try {
        let isConnected = wsRef.current?.readyState === WebSocket.OPEN;

        if (!isConnected) {
          console.log("Connection not open, attempting to reconnect...");
          isConnected = await ensureConnection();
        }

        if (!isConnected || !wsRef.current) {
          console.error("Failed to establish WebSocket connection");
          return false;
        }

        wsRef.current.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error("Failed to send message:", error);
        return false;
      }
    },
    [ensureConnection]
  );

  // Initial connection
  useEffect(() => {
    isComponentMounted.current = true;
    connect();

    return () => {
      isComponentMounted.current = false;
      cleanupWebSocket();
    };
  }, [connect, cleanupWebSocket]);

  // Add message handler setup
  useEffect(() => {
    if (!wsRef.current) return;

    wsRef.current.onmessage = (event) => {
      if (!isComponentMounted.current) return;

      try {
        const data = JSON.parse(event.data);
        if (data.type === "status_update" && data.data) {
          onStatusUpdate?.(data.data);
        }
      } catch (error) {
        console.warn("Failed to parse WebSocket message:", error);
      }
    };
  }, [onStatusUpdate]);

  return {
    sendMessage,
    isConnected: wsRef.current?.readyState === WebSocket.OPEN,
    connectionStatus,
  };
}
