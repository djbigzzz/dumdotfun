import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  maxUses: 7500,
});

pool.on("error", (err: any) => {
  const isNeonHibernation =
    err.code === "57P01" ||
    (typeof err.message === "string" &&
      (err.message.includes("terminating connection") ||
        err.message.includes("Connection terminated")));
  if (isNeonHibernation) {
    console.warn("[db] Neon connection terminated (serverless hibernation) — pool will reconnect automatically.");
  } else {
    console.error("[db] Unexpected pool error:", err);
  }
});

export const db = drizzle({ client: pool, schema });
