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
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 3000;

  const cleanupWebSocket = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // 정리 중에 onclose 이벤트가 발생하지 않도록
      wsRef.current.close();
      wsRef.current = null;
    }
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (
      !gameCode ||
      isConnectingRef.current ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    cleanupWebSocket();
    isConnectingRef.current = true;

    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const baseUrl = `${protocol}//localhost:8000`;
      const wsUrl = `${baseUrl}/game/${gameCode}/ws`; // URL 경로 수정

      console.log(`Attempting WebSocket connection to: ${wsUrl}`);
      setConnectionStatus("connecting");

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket Connected Successfully");
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("Received:", data);
          if (data.type === "status_update" && data.data) {
            onStatusUpdate?.(data.data);
          }
        } catch (error) {
          console.warn("Failed to parse WebSocket message:", error);
        }
      };

      ws.onerror = (event) => {
        console.error("WebSocket Error:", event);
        onError?.(new Error("WebSocket connection error"));
        isConnectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log(
          `WebSocket Closed: ${event.code} - ${
            event.reason || "No reason provided"
          }`
        );
        setConnectionStatus("disconnected");
        isConnectingRef.current = false;
        wsRef.current = null;

        // 정상적인 종료가 아닐 경우에만 재연결 시도
        if (event.code !== 1000 && event.code !== 1001) {
          if (reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
            console.log(
              `Scheduling reconnect attempt ${
                reconnectAttemptsRef.current + 1
              }/${MAX_RECONNECT_ATTEMPTS}`
            );
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectAttemptsRef.current += 1;
              connect();
            }, RECONNECT_DELAY);
          } else {
            console.error("Maximum reconnection attempts reached");
            onError?.(
              new Error("Failed to establish stable WebSocket connection")
            );
          }
        }
      };
    } catch (error) {
      console.error("Failed to create WebSocket connection:", error);
      setConnectionStatus("disconnected");
      isConnectingRef.current = false;
      onError?.(error);
    }
  }, [gameCode, onStatusUpdate, onError, cleanupWebSocket]);

  useEffect(() => {
    connect();
    return cleanupWebSocket;
  }, [connect, cleanupWebSocket]);

  // WebSocket 연결 상태 모니터링
  useEffect(() => {
    const checkConnection = () => {
      if (
        connectionStatus === "disconnected" &&
        !isConnectingRef.current &&
        reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
      ) {
        connect();
      }
    };

    const intervalId = setInterval(checkConnection, RECONNECT_DELAY);
    return () => clearInterval(intervalId);
  }, [connectionStatus, connect]);

  const sendMessage = useCallback((message: WebSocketMessage): boolean => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket is not connected");
      return false;
    }

    try {
      wsRef.current.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error("Failed to send message:", error);
      return false;
    }
  }, []);

  return {
    sendMessage,
    isConnected: connectionStatus === "connected",
    connectionStatus,
  };
}
