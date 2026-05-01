import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { Worker } from "worker_threads";
import { db } from "./db";
import { vanityKeypairs } from "../shared/schema";
import { sql, eq, and } from "drizzle-orm";

// We refill the DB pool when available count drops below this. The grinder
// keeps pushing until we hit POOL_TARGET so a freshly-booted replica catches
// up, but it also cooperates with sibling replicas via DB-level uniqueness.
const POOL_TARGET = 32;
// Cap how many issued candidates we'll skip before falling back to a fresh
// random keypair. Defends against a degenerate pool full of stale entries
// blocking a user's create-token request. Set generously because the
// JSON-seeded historical pool was 100% stale - we want to drain those in one
// call, not deliver a non-vanity key when good ones exist further down.
const MAX_VALIDATION_TRIES = 8;

let started = false;
let worker: Worker | null = null;
let workerPaused = false;
let monitorTimer: NodeJS.Timeout | null = null;
const MONITOR_INTERVAL_MS = 60_000;

async function getAvailableCount(): Promise<number> {
  const [row] = await db.execute<{ c: number }>(
    sql`SELECT count(*)::int AS c FROM vanity_keypairs WHERE status = 'available'`
  ).then(r => r.rows as any);
  return row?.c ?? 0;
}

export async function getVanityPoolStatus() {
  return { size: await getAvailableCount(), target: POOL_TARGET };
}

export function startVanityGrinder() {
  if (started) return;
  started = true;

  // Bootstrap log so the operator can see we're up.
  getAvailableCount().then(n => {
    console.log(`[vanity] grinder starting, pool: ${n}/${POOL_TARGET}`);
  }).catch(() => {});

  const workerCode = `
    const { parentPort } = require("worker_threads");
    const { Keypair } = require("@solana/web3.js");
    const SUFFIXES = ["dum", "DUM", "Dum"];
    let attempts = 0;
    let lastReport = Date.now();
    let paused = false;
    parentPort.on("message", (msg) => {
      if (msg && msg.type === "pause") paused = true;
      if (msg && msg.type === "resume") paused = false;
    });
    (function loop() {
      if (!paused) {
        for (let i = 0; i < 1000; i++) {
          const kp = Keypair.generate();
          const pk = kp.publicKey.toBase58();
          attempts++;
          for (const s of SUFFIXES) {
            if (pk.endsWith(s)) {
              parentPort.postMessage({ type: "found", secret: Array.from(kp.secretKey), pubkey: pk, suffix: s });
              break;
            }
          }
        }
        const now = Date.now();
        if (now - lastReport > 30000) {
          parentPort.postMessage({ type: "progress", attempts });
          attempts = 0;
          lastReport = now;
        }
      }
      // Yield to the event loop so the pause/resume messages are processed.
      setImmediate(loop);
    })();
  `;

  try {
    worker = new Worker(workerCode, { eval: true });
    worker.on("message", async (msg: any) => {
      if (msg?.type === "found") {
        // While paused we still expect a few in-flight 'found' messages to
        // arrive (the worker pauses on its next setImmediate tick). Drop them
        // to avoid bloating the DB; the monitor loop will resume the worker
        // when the pool drains.
        if (workerPaused) return;
        try {
          const inserted = await db.insert(vanityKeypairs).values({
            pubkey: msg.pubkey,
            secret: JSON.stringify(msg.secret),
            suffix: msg.suffix,
          }).onConflictDoNothing().returning({ pubkey: vanityKeypairs.pubkey });
          if (inserted.length > 0) {
            const have = await getAvailableCount().catch(() => -1);
            console.log(`[vanity] minted ${msg.pubkey} (${msg.suffix}) pool: ${have}/${POOL_TARGET}`);
          }
        } catch (err) {
          console.error("[vanity] insert failed:", err);
        }
      } else if (msg?.type === "progress") {
        const n = await getAvailableCount().catch(() => -1);
        console.log(`[vanity] worker progress: ${msg.attempts} attempts in last 30s, pool: ${n}/${POOL_TARGET}`);
      }
    });
    worker.on("error", (err) => { console.error("[vanity] worker error:", err); });
    worker.on("exit", (code) => {
      console.log(`[vanity] worker exited with code ${code}`);
      worker = null;
      if (monitorTimer) { clearInterval(monitorTimer); monitorTimer = null; }
    });

    // Single recurring monitor: pauses or resumes the worker based on current
    // pool size. Always self-reschedules, so we can never stall permanently.
    // Wrapped in try/catch so a transient DB hiccup never becomes an
    // unhandled rejection (which would crash the process under our
    // unhandledRejection handler).
    const monitorTick = async () => {
      try {
        const n = await getAvailableCount();
        if (n >= POOL_TARGET && !workerPaused) {
          workerPaused = true;
          worker?.postMessage({ type: "pause" });
        } else if (n < POOL_TARGET && workerPaused) {
          workerPaused = false;
          worker?.postMessage({ type: "resume" });
          console.log(`[vanity] resuming grinder, pool: ${n}/${POOL_TARGET}`);
        }
      } catch (err) {
        console.error("[vanity] monitor tick failed:", err);
      }
    };
    monitorTimer = setInterval(monitorTick, MONITOR_INTERVAL_MS);
    // Run an immediate tick so pause kicks in before the worker overproduces
    // on a freshly-booted replica with a healthy DB pool.
    monitorTick();
  } catch (err) {
    console.error("[vanity] failed to start worker:", err);
  }
}

async function isAddressUnusedOnChain(connection: Connection, pubkey: PublicKey): Promise<boolean> {
  try {
    const info = await connection.getAccountInfo(pubkey, "confirmed");
    return info === null;
  } catch (err) {
    console.warn("[vanity] on-chain probe failed for", pubkey.toBase58(), err);
    return false;
  }
}

// Atomically claim ONE available keypair across all replicas. The single
// UPDATE statement is the entire isolation primitive: only one transaction
// can land the row update, the others see no rows and move on.
async function claimOneAvailable(): Promise<{ pubkey: string; secret: string; suffix: string } | null> {
  const result = await db.execute<{ pubkey: string; secret: string; suffix: string }>(sql`
    UPDATE vanity_keypairs
    SET status = 'issued', issued_at = now()
    WHERE id = (
      SELECT id FROM vanity_keypairs
      WHERE status = 'available'
      ORDER BY created_at
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING pubkey, secret, suffix
  `);
  const rows = result.rows as any[];
  return rows[0] ?? null;
}

async function markInvalid(pubkey: string): Promise<void> {
  try {
    await db.update(vanityKeypairs)
      .set({ status: "invalid" })
      .where(and(eq(vanityKeypairs.pubkey, pubkey), eq(vanityKeypairs.status, "issued")));
  } catch (err) {
    console.warn("[vanity] failed to mark invalid:", err);
  }
}

export async function getVanityMintKeypair(
  connection: Connection,
): Promise<{ keypair: Keypair; vanity: boolean; suffix: string | null }> {
  // Try up to N pool entries. Each call to claimOneAvailable atomically
  // transitions one row to 'issued', so concurrent requests across replicas
  // never get the same key. If the row's pubkey turns out to already exist on
  // chain (e.g. issued long ago by a previous deploy), we mark it 'invalid'
  // and try the next.
  for (let i = 0; i < MAX_VALIDATION_TRIES; i++) {
    const claimed = await claimOneAvailable();
    if (!claimed) break;
    let kp: Keypair;
    try {
      kp = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(claimed.secret)));
    } catch (err) {
      console.warn("[vanity] bad secret blob, marking invalid:", claimed.pubkey, err);
      await markInvalid(claimed.pubkey);
      continue;
    }
    const unused = await isAddressUnusedOnChain(connection, kp.publicKey);
    if (unused) {
      return { keypair: kp, vanity: true, suffix: claimed.suffix };
    }
    console.warn(`[vanity] dropping stale pool entry ${claimed.pubkey} (already on-chain)`);
    await markInvalid(claimed.pubkey);
  }
  // Fresh random keypair: 256 bits of entropy, collision is astronomically
  // unlikely so we don't bother probing.
  return { keypair: Keypair.generate(), vanity: false, suffix: null };
}
