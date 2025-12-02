import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import { log } from "./index";

// PumpPortal WebSocket endpoint for real-time data
const PUMP_PORTAL_WS = "wss://pumpportal.fun/api/data";

interface TokenUpdate {
  type: "trade" | "create" | "complete";
  mint: string;
  name?: string;
  symbol?: string;
  tradeType?: "buy" | "sell";
  solAmount?: number;
  tokenAmount?: number;
  marketCapSol?: number;
  bondingCurveProgress?: number;
  timestamp: number;
}

interface ClientMessage {
  type: "subscribe" | "unsubscribe";
  mints?: string[];
  channel?: "trades" | "newTokens" | "all";
}

// Track connected clients and their subscriptions
// Note: "all" subscription means all NEW TOKEN creations
// Trade updates require explicit mint subscriptions
const clients = new Map<WebSocket, Set<string>>();
let upstreamWs: WebSocket | null = null;
let reconnectTimeout: NodeJS.Timeout | null = null;
let subscribedMints = new Set<string>();

// Connect to PumpPortal upstream
function connectUpstream() {
  if (clients.size === 0) {
    log("No clients connected, skipping upstream connection", "websocket");
    return;
  }

  if (upstreamWs?.readyState === WebSocket.OPEN) return;

  try {
    upstreamWs = new WebSocket(PUMP_PORTAL_WS);

    upstreamWs.on("open", () => {
      log("Connected to PumpPortal WebSocket", "websocket");
      
      // Check if still connected before sending
      if (upstreamWs?.readyState === WebSocket.OPEN) {
        // Subscribe to new token creations
        upstreamWs.send(JSON.stringify({
          method: "subscribeNewToken",
        }));

        // Resubscribe to any previously tracked mints
        if (subscribedMints.size > 0) {
          upstreamWs.send(JSON.stringify({
            method: "subscribeTokenTrade",
            keys: Array.from(subscribedMints),
          }));
        }
      }
    });

    upstreamWs.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        handleUpstreamMessage(message);
      } catch (error) {
        console.error("Error parsing upstream message:", error);
      }
    });

    upstreamWs.on("close", () => {
      log("Disconnected from PumpPortal, reconnecting...", "websocket");
      upstreamWs = null;
      scheduleReconnect();
    });

    upstreamWs.on("error", (error) => {
      console.error("Upstream WebSocket error:", error);
      upstreamWs = null;
      scheduleReconnect();
    });
  } catch (error) {
    console.error("Failed to connect to upstream:", error);
    scheduleReconnect();
  }
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  if (clients.size === 0) return;
  
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    connectUpstream();
  }, 5000);
}

function disconnectUpstreamIfNoClients() {
  if (clients.size === 0 && upstreamWs) {
    log("No clients remaining, closing upstream connection", "websocket");
    // Only close if the WebSocket is open or connecting
    if (upstreamWs.readyState === WebSocket.OPEN || upstreamWs.readyState === WebSocket.CONNECTING) {
      try {
        upstreamWs.close();
      } catch (e) {
        // Ignore close errors
      }
    }
    upstreamWs = null;
    subscribedMints.clear();
  }
}

// Handle messages from PumpPortal
// PumpPortal message format varies by event type
function handleUpstreamMessage(message: any) {
  let update: TokenUpdate | null = null;

  // New token creation event
  // Fields: signature, mint, traderPublicKey, txType, initialBuy, bondingCurveKey,
  //         vTokensInBondingCurve, vSolInBondingCurve, marketCapSol, name, symbol, uri
  if (message.txType === "create" && message.mint) {
    update = {
      type: "create",
      mint: message.mint,
      name: message.name || undefined,
      symbol: message.symbol || undefined,
      marketCapSol: typeof message.marketCapSol === "number" ? message.marketCapSol : undefined,
      timestamp: Date.now(),
    };
    
    // Auto-subscribe to trades for new tokens
    if (upstreamWs?.readyState === WebSocket.OPEN) {
      subscribedMints.add(message.mint);
      upstreamWs.send(JSON.stringify({
        method: "subscribeTokenTrade",
        keys: [message.mint],
      }));
    }
  }
  // Trade event (buy/sell)
  // PumpPortal trade fields: signature, mint, traderPublicKey, txType, tokenAmount, 
  //   solAmount (the actual trade amount in lamports), newTokenBalance, 
  //   bondingCurveKey, vTokensInBondingCurve, vSolInBondingCurve, marketCapSol
  else if ((message.txType === "buy" || message.txType === "sell") && message.mint) {
    const vTokens = message.vTokensInBondingCurve;
    // Use solAmount (actual trade amount) instead of vSolInBondingCurve (virtual reserve)
    const tradeSolAmount = message.solAmount;
    
    update = {
      type: "trade",
      mint: message.mint,
      tradeType: message.txType,
      solAmount: typeof tradeSolAmount === "number" ? tradeSolAmount / 1e9 : undefined,
      tokenAmount: typeof message.tokenAmount === "number" ? message.tokenAmount : undefined,
      marketCapSol: typeof message.marketCapSol === "number" ? message.marketCapSol : undefined,
      bondingCurveProgress: typeof vTokens === "number" ? calculateProgress(vTokens) : undefined,
      timestamp: Date.now(),
    };
  }
  // Graduation/completion event - token migrated to Raydium
  // PumpPortal uses txType "complete" or "migrate" for graduation
  else if ((message.txType === "complete" || message.txType === "migrate") && message.mint) {
    update = {
      type: "complete",
      mint: message.mint,
      timestamp: Date.now(),
    };
    
    // Clean up subscription for graduated token
    subscribedMints.delete(message.mint);
  }

  if (update) {
    broadcastToClients(update);
  }
}

function calculateProgress(virtualTokenReserves: number): number {
  const initialVirtualTokenReserves = 1073000191;
  const progress = ((initialVirtualTokenReserves - virtualTokenReserves) / initialVirtualTokenReserves) * 100;
  return Math.min(Math.max(progress, 0), 100);
}

// Broadcast update to all subscribed clients
function broadcastToClients(update: TokenUpdate) {
  const message = JSON.stringify(update);

  clients.forEach((subscriptions, client) => {
    if (client.readyState !== WebSocket.OPEN) return;

    // Send to clients subscribed to "all" or the specific mint
    if (subscriptions.has("all") || subscriptions.has(update.mint)) {
      client.send(message);
    }
  });
}

// Set up WebSocket server
export function setupWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ 
    server,
    path: "/ws",
  });

  wss.on("connection", (ws) => {
    log("Client connected", "websocket");
    
    // Initialize client subscriptions (default to all updates)
    clients.set(ws, new Set(["all"]));

    // Ensure upstream connection is active
    connectUpstream();

    ws.on("message", (data) => {
      try {
        const message: ClientMessage = JSON.parse(data.toString());
        handleClientMessage(ws, message);
      } catch (error) {
        console.error("Error parsing client message:", error);
      }
    });

    ws.on("close", () => {
      log("Client disconnected", "websocket");
      clients.delete(ws);
      disconnectUpstreamIfNoClients();
    });

    ws.on("error", (error) => {
      console.error("Client WebSocket error:", error);
      clients.delete(ws);
      disconnectUpstreamIfNoClients();
    });

    // Send connection confirmation
    ws.send(JSON.stringify({
      type: "connected",
      message: "Connected to Dum.fun real-time updates",
    }));
  });

  log("WebSocket server initialized", "websocket");
  return wss;
}

// Handle subscription messages from clients
function handleClientMessage(ws: WebSocket, message: ClientMessage) {
  const subscriptions = clients.get(ws);
  if (!subscriptions) return;

  switch (message.type) {
    case "subscribe":
      if (message.channel === "all") {
        subscriptions.add("all");
      } else if (message.mints) {
        message.mints.forEach((mint) => {
          subscriptions.add(mint);
          // Forward subscription to PumpPortal upstream
          if (!subscribedMints.has(mint) && upstreamWs?.readyState === WebSocket.OPEN) {
            subscribedMints.add(mint);
            upstreamWs.send(JSON.stringify({
              method: "subscribeTokenTrade",
              keys: [mint],
            }));
          }
        });
      }
      break;

    case "unsubscribe":
      if (message.channel === "all") {
        subscriptions.delete("all");
      } else if (message.mints) {
        message.mints.forEach((mint) => {
          subscriptions.delete(mint);
          // Check if any other client is subscribed to this mint
          let stillSubscribed = false;
          clients.forEach((subs) => {
            if (subs.has(mint) || subs.has("all")) stillSubscribed = true;
          });
          // Unsubscribe from upstream if no clients need it
          if (!stillSubscribed && subscribedMints.has(mint) && upstreamWs?.readyState === WebSocket.OPEN) {
            subscribedMints.delete(mint);
            upstreamWs.send(JSON.stringify({
              method: "unsubscribeTokenTrade",
              keys: [mint],
            }));
          }
        });
      }
      break;
  }

  // Send confirmation
  ws.send(JSON.stringify({
    type: "subscribed",
    subscriptions: Array.from(subscriptions),
  }));
}

// Utility to get connection stats
export function getConnectionStats() {
  return {
    connectedClients: clients.size,
    upstreamConnected: upstreamWs?.readyState === WebSocket.OPEN,
  };
}
