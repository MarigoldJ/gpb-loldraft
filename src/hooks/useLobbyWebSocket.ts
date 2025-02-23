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
  userId?: string; // userId 추가
  isSpectator?: boolean;
  onStatusUpdate?: (data: any) => void;
  onError?: (error: any) => void;
}

export function useLobbyWebSocket({
  gameCode,
  userId, // userId 파라미터 추가
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

  const attemptReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
      const delay = RECONNECT_DELAY * (reconnectAttemptsRef.current + 1);
      console.log(
        `Scheduling reconnect attempt ${
          reconnectAttemptsRef.current + 1
        } in ${delay}ms`
      );

      reconnectTimeoutRef.current = setTimeout(() => {
        if (isComponentMounted.current) {
          reconnectAttemptsRef.current++;
          ensureConnection();
        }
      }, delay);
    } else {
      onError?.(new Error("Maximum reconnection attempts reached"));
    }
  }, [onError]); // ensureConnection will be used inside useEffect

  const ensureConnection = useCallback(async (): Promise<boolean> => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return true;
    }

    return new Promise((resolve) => {
      if (!gameCode || !userId || !isComponentMounted.current) {
        console.error("Missing required parameters for WebSocket connection");
        resolve(false);
        return;
      }

      // URL에 userId 파라미터 추가
      const ws = new WebSocket(
        `ws://localhost:8000/ws/draft?id=${gameCode}&userId=${userId}&spectator=${isSpectator}`
      );
      wsRef.current = ws;

      const timeoutId = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          console.error("WebSocket connection timeout");
          ws.close();
          resolve(false);
        }
      }, CONNECTION_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(timeoutId);
        console.log("WebSocket Connected Successfully");
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
        resolve(true);
      };

      ws.onmessage = (event) => {
        if (!isComponentMounted.current) return;

        try {
          const data = JSON.parse(event.data);
          console.log("Received message:", data);
          if (data.type === "status_update" && data.data) {
            onStatusUpdate?.(data.data);
          }
        } catch (error) {
          console.warn("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (event) => {
        clearTimeout(timeoutId);
        console.error("WebSocket Error:", event);
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        wsRef.current = null;
        resolve(false);
      };

      ws.onclose = (event) => {
        clearTimeout(timeoutId);
        if (!isComponentMounted.current) return;

        console.log(
          `WebSocket Closed: ${event.code} - ${event.reason || "No reason"}`
        );
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        wsRef.current = null;

        if (event.code !== 1000 && event.code !== 1001) {
          attemptReconnect();
        }
        resolve(false);
      };
    });
  }, [gameCode, userId, isSpectator, attemptReconnect, onStatusUpdate]);

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
