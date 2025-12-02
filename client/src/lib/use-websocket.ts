import { useEffect, useRef, useState, useCallback } from "react";

interface TokenUpdate {
  type: "trade" | "create" | "complete" | "connected" | "subscribed";
  mint?: string;
  name?: string;
  symbol?: string;
  tradeType?: "buy" | "sell";
  solAmount?: number;
  tokenAmount?: number;
  price?: number;
  marketCapSol?: number;
  bondingCurveProgress?: number;
  timestamp?: number;
  message?: string;
  subscriptions?: string[];
}

interface UseWebSocketOptions {
  onUpdate?: (update: TokenUpdate) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { onUpdate, onConnect, onDisconnect, autoReconnect = true } = options;
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<TokenUpdate | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    // Use the same protocol as the page, connect to our /ws endpoint
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const update: TokenUpdate = JSON.parse(event.data);
          setLastUpdate(update);
          onUpdate?.(update);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onclose = () => {
        setIsConnected(false);
        onDisconnect?.();
        wsRef.current = null;

        if (autoReconnect) {
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, 3000);
        }
      };

      ws.onerror = () => {
        // Silently handle connection errors - reconnect will handle recovery
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
    }
  }, [onUpdate, onConnect, onDisconnect, autoReconnect]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const subscribe = useCallback((mints: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        mints,
      }));
    }
  }, []);

  const subscribeAll = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "subscribe",
        channel: "all",
      }));
    }
  }, []);

  const unsubscribe = useCallback((mints: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "unsubscribe",
        mints,
      }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastUpdate,
    subscribe,
    subscribeAll,
    unsubscribe,
    connect,
    disconnect,
  };
}
