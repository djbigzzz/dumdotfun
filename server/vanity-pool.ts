import { Keypair } from "@solana/web3.js";
import { Worker } from "worker_threads";
import fs from "fs";
import path from "path";

const POOL_TARGET = 8;
const POOL_FILE = path.join(process.cwd(), ".local", "state", "vanity-pool.json");

let pool: { secret: number[]; pubkey: string; suffix: string }[] = [];
let started = false;
let worker: Worker | null = null;

function loadPool() {
  try {
    if (fs.existsSync(POOL_FILE)) {
      const raw = fs.readFileSync(POOL_FILE, "utf8");
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) {
        pool = arr.filter((e) => e && Array.isArray(e.secret) && typeof e.pubkey === "string");
      }
    }
  } catch {
    pool = [];
  }
}

function savePool() {
  try {
    fs.mkdirSync(path.dirname(POOL_FILE), { recursive: true });
    fs.writeFileSync(POOL_FILE, JSON.stringify(pool));
  } catch {
    // best effort
  }
}

export function startVanityGrinder() {
  if (started) return;
  started = true;
  loadPool();
  console.log(`[vanity] grinder starting, pool: ${pool.length}/${POOL_TARGET}`);

  const workerCode = `
    const { parentPort } = require("worker_threads");
    const { Keypair } = require("@solana/web3.js");
    const SUFFIXES = ["dum", "DUM", "Dum"];
    let attempts = 0;
    let lastReport = Date.now();
    while (true) {
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
  `;

  try {
    worker = new Worker(workerCode, { eval: true });
    worker.on("message", (msg: any) => {
      if (msg?.type === "found" && pool.length < POOL_TARGET * 2) {
        pool.push({ secret: msg.secret, pubkey: msg.pubkey, suffix: msg.suffix });
        savePool();
        console.log(`[vanity] minted ${msg.pubkey} (${msg.suffix}) pool: ${pool.length}/${POOL_TARGET}`);
      } else if (msg?.type === "progress") {
        console.log(`[vanity] worker progress: ${msg.attempts} attempts in last 30s, pool: ${pool.length}/${POOL_TARGET}`);
      }
    });
    worker.on("error", (err) => {
      console.error("[vanity] worker error:", err);
    });
    worker.on("exit", (code) => {
      console.log(`[vanity] worker exited with code ${code}`);
      worker = null;
    });
  } catch (err) {
    console.error("[vanity] failed to start worker:", err);
  }
}

export function getVanityMintKeypair(): { keypair: Keypair; vanity: boolean; suffix: string | null } {
  if (pool.length > 0) {
    const entry = pool.shift()!;
    savePool();
    try {
      const kp = Keypair.fromSecretKey(Uint8Array.from(entry.secret));
      return { keypair: kp, vanity: true, suffix: entry.suffix };
    } catch {
      // fall through
    }
  }
  return { keypair: Keypair.generate(), vanity: false, suffix: null };
}

export function getVanityPoolStatus() {
  return { size: pool.length, target: POOL_TARGET };
}
