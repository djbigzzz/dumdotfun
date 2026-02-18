import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupWebSocket } from "./websocket";
import rateLimit from "express-rate-limit";

const app = express();
const httpServer = createServer(app);

// Set up WebSocket server
setupWebSocket(httpServer);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Rate limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: "Too many requests, please try again later" },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', generalLimiter);
app.use('/api/admin/', strictLimiter);
app.use('/api/trade/build', strictLimiter);
app.use('/api/tokens/create', strictLimiter);
app.use('/api/markets/prepare-create', strictLimiter);

app.use(
  express.json({
    limit: '2mb',
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false, limit: '2mb' }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        // Truncate response logs to avoid leaking sensitive data (balances, keys, signatures)
        const summary = JSON.stringify(capturedJsonResponse);
        logLine += ` :: ${summary.length > 200 ? summary.slice(0, 200) + '...' : summary}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Check for expired markets on startup and log them
  const checkExpiredMarkets = async () => {
    try {
      const { storage } = await import("./storage");
      const expiredMarkets = await storage.getExpiredMarkets();
      if (expiredMarkets.length > 0) {
        log(`[Markets] Found ${expiredMarkets.length} expired market(s) awaiting resolution:`, "startup");
        for (const market of expiredMarkets.slice(0, 5)) {
          log(`  - "${market.question}" (expired: ${new Date(market.resolutionDate).toLocaleDateString()})`, "startup");
        }
        if (expiredMarkets.length > 5) {
          log(`  ... and ${expiredMarkets.length - 5} more. Use GET /api/markets/expired to see all.`, "startup");
        }
      }
    } catch (error) {
      console.error("Failed to check expired markets:", error);
    }
  };
  
  // Run after brief delay to let server finish starting
  setTimeout(checkExpiredMarkets, 2000);

  // Scheduled auto-resolution: check every 5 minutes for expired markets
  const AUTO_RESOLVE_INTERVAL = 5 * 60 * 1000;
  setInterval(async () => {
    try {
      const { autoResolveExpiredMarkets } = await import("./services/auto-resolver");
      const results = await autoResolveExpiredMarkets();
      if (results.length > 0) {
        log(`[AutoResolver] Resolved ${results.length} market(s)`, "auto-resolve");
        for (const r of results) {
          log(`  - "${r.question}" → ${r.outcome.toUpperCase()} (${r.reason})`, "auto-resolve");
        }
      }
    } catch (error) {
      console.error("[AutoResolver] Scheduled resolution error:", error);
    }
  }, AUTO_RESOLVE_INTERVAL);
  log(`[AutoResolver] Scheduled every ${AUTO_RESOLVE_INTERVAL / 1000}s`, "startup");

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
