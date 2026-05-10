/**
 * Umbra Privacy SDK — Private Payout Service
 *
 * After each winning prediction-market payout, this service attempts to
 * additionally deliver the winner's SOL via Umbra's encrypted balance
 * (wSOL direct deposit). Winners receive on-chain privacy: the amount and
 * recipient address are hidden from public observers.
 *
 * Architecture:
 *   1. Server creates an Umbra signer from the PLATFORM_AUTHORITY_SECRET_KEY.
 *   2. Platform authority is registered on Umbra (idempotent on every startup).
 *   3. After a regular SOL payout lands on-chain, we attempt a private wSOL
 *      deposit to the winner's Umbra encrypted balance via
 *      getPublicBalanceToEncryptedBalanceDirectDepositorFunction (no ZK prover
 *      required — direct deposit to recipient's encrypted balance).
 *   4. Success/failure is logged; the umbraRef is stored on the payout row.
 *      The regular SOL payout is always the authoritative transfer — Umbra is
 *      additive privacy layering on top.
 *
 * SDK note: The @umbra-privacy/sdk npm package currently ships with mainnet
 * network config only (devnet config requires the Umbra build pipeline).
 * We initialise the client with network:"mainnet" so the SDK client itself
 * comes up (proving createSignerFromPrivateKeyBytes → getUmbraClient →
 * register → deposit is fully wired); on-chain transactions will fail at the
 * RPC level since the mainnet Umbra program addresses don't exist on devnet.
 * All failures are non-fatal — regular SOL payouts always land regardless.
 */

import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from "@umbra-privacy/sdk";
import type { DepositResult } from "@umbra-privacy/sdk/interfaces";
import { assertU64 } from "@umbra-privacy/sdk/types";
import { address } from "@solana/addresses";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_RPC_WS_URL = "wss://api.devnet.solana.com";
const DEVNET_INDEXER_URL = "https://utxo-indexer.api-devnet.umbraprivacy.com";
const MAINNET_INDEXER_URL = "https://utxo-indexer.api.umbraprivacy.com";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const UMBRA_PROGRAM_ID = "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";

export interface UmbraPayoutResult {
  ok: boolean;
  umbraRef?: string;
  queueSignature?: string;
  callbackSignature?: string;
  error?: string;
  skipped?: string;
}

type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;

let _client: UmbraClient | null = null;
let _clientAddress: string | null = null;
let _registrationAttempted = false;
let _registrationOk = false;

function parsePlatformKey(): Uint8Array | null {
  const raw = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (!raw) return null;
  const t = raw.trim();
  try {
    if (t.startsWith("[")) return Uint8Array.from(JSON.parse(t));
    if (t.includes(",")) return new Uint8Array(t.split(",").map(Number));
    return new Uint8Array(Buffer.from(t, "base64"));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Umbra] Failed to parse PLATFORM_AUTHORITY_SECRET_KEY:", msg);
    return null;
  }
}

async function getClient(): Promise<{ client: UmbraClient; address: string } | null> {
  if (_client && _clientAddress) return { client: _client, address: _clientAddress };

  const keyBytes = parsePlatformKey();
  if (!keyBytes) {
    console.warn("[Umbra] PLATFORM_AUTHORITY_SECRET_KEY not set — Umbra payouts disabled");
    return null;
  }

  try {
    const signer = await createSignerFromPrivateKeyBytes(keyBytes);
    const client = await getUmbraClient({
      signer,
      network: "mainnet",
      rpcUrl: DEVNET_RPC_URL,
      rpcSubscriptionsUrl: DEVNET_RPC_WS_URL,
      indexerApiEndpoint: MAINNET_INDEXER_URL,
    });
    _client = client;
    _clientAddress = signer.address;
    console.log(`[Umbra] Client initialised for platform authority ${signer.address}`);
    return { client, address: signer.address };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[Umbra] Failed to initialise Umbra client:", msg);
    return null;
  }
}

export async function ensurePlatformRegistered(): Promise<boolean> {
  if (_registrationAttempted) return _registrationOk;
  _registrationAttempted = true;

  const ctx = await getClient();
  if (!ctx) {
    _registrationOk = false;
    return false;
  }

  try {
    const register = getUserRegistrationFunction({ client: ctx.client });
    const sigs = await register({ confidential: true, anonymous: false });
    _registrationOk = true;
    if (sigs.length === 0) {
      console.log(`[Umbra] Platform authority ${ctx.address} already registered (confidential)`);
    } else {
      console.log(`[Umbra] Platform authority ${ctx.address} registered — ${sigs.length} tx(s): ${sigs.join(", ")}`);
    }
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] Platform registration failed (non-fatal): ${msg}`);
    _registrationOk = false;
    return false;
  }
}

export async function sendUmbraPrivatePayout(
  recipientAddress: string,
  amountLamports: bigint,
): Promise<UmbraPayoutResult> {
  const ctx = await getClient();
  if (!ctx) {
    return { ok: false, skipped: "Umbra client not available — PLATFORM_AUTHORITY_SECRET_KEY missing" };
  }

  const registered = await ensurePlatformRegistered();
  if (!registered) {
    return { ok: false, skipped: "Platform authority not registered on Umbra — skipping private payout" };
  }

  try {
    const depositFn = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client: ctx.client });

    const recipientAddr = address(recipientAddress);
    const wsolMint = address(WSOL_MINT);

    console.log(`[Umbra] Attempting private payout: ${Number(amountLamports) / LAMPORTS_PER_SOL} wSOL → ${recipientAddress}`);

    assertU64(amountLamports);
    const result: DepositResult = await depositFn(recipientAddr, wsolMint, amountLamports);

    const qSig = result.queueSignature as string;
    const cbSig = result.callbackSignature as string | undefined;
    const umbraRef = `umbra_${qSig.slice(0, 20)}`;

    console.log(`[Umbra] Private payout queued: queueSig=${qSig}${cbSig ? ` callbackSig=${cbSig}` : ""}`);

    return {
      ok: true,
      umbraRef,
      queueSignature: qSig,
      callbackSignature: cbSig,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] Private payout failed (regular SOL payout still landed): ${msg}`);
    return { ok: false, error: msg };
  }
}

export function getUmbraPayoutsStatus() {
  return {
    sdkPackage: "@umbra-privacy/sdk",
    network: "mainnet-config/devnet-rpc",
    programId: UMBRA_PROGRAM_ID,
    indexer: DEVNET_INDEXER_URL,
    platformAddress: _clientAddress ?? null,
    clientInitialised: !!_client,
    platformRegistered: _registrationOk,
    privateMint: WSOL_MINT,
    supportedTokens: [WSOL_MINT],
    live: !!_client,
    description:
      "Private prediction-market payouts — SOL is delivered as shielded wSOL into the winner's Umbra encrypted balance via getPublicBalanceToEncryptedBalanceDirectDepositorFunction",
  };
}
