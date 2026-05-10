/**
 * Umbra Privacy SDK — Private Payout Service
 *
 * For each winning prediction-market position, this service can create a
 * receiver-claimable UTXO that ONLY the winner can claim into their Umbra
 * encrypted balance (ETA). The flow is:
 *
 *     Server (this file)                         Client (market.tsx)
 *     ──────────────────                         ───────────────────
 *     getPublicBalanceToReceiverClaimable        getClaimableUtxoScannerFunction
 *       UtxoCreatorFunction              ──→     getReceiverClaimableUtxoTo
 *     (wSOL → ReceiverClaimableUtxo)               EncryptedBalanceClaimerFunction
 *                                                 (UTXO → recipient's ETA)
 *
 * The server returns `{ utxoRef, scanHint, viewingKey }`. The receiver scans
 * for UTXOs locked to their on-chain user-commitment, and uses the viewing
 * key to selectively reveal the amount to an auditor.
 *
 * SDK note: The @umbra-privacy/sdk npm package currently ships with mainnet
 * network config only (devnet config requires the Umbra build pipeline).
 * We initialise the client with `network:"mainnet"` so the SDK comes up;
 * on-chain transactions will fail at the RPC level since the mainnet Umbra
 * program addresses don't exist on devnet. All failures are non-fatal —
 * regular SOL payouts always land regardless.
 */

import {
  createSignerFromPrivateKeyBytes,
  getUmbraClient,
  getUserRegistrationFunction,
  getPublicBalanceToReceiverClaimableUtxoCreatorFunction,
  getPublicBalanceToEncryptedBalanceDirectDepositorFunction,
} from "@umbra-privacy/sdk";
import type {
  CreateUtxoFromPublicBalanceResult,
  DepositResult,
} from "@umbra-privacy/sdk/interfaces";
import { assertU64 } from "@umbra-privacy/sdk/types";
import {
  getCdnZkAssetProvider,
  getCreateReceiverClaimableUtxoFromPublicBalanceProver,
} from "@umbra-privacy/web-zk-prover";
import { address } from "@solana/addresses";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import crypto from "node:crypto";

const DEVNET_RPC_URL = "https://api.devnet.solana.com";
const DEVNET_RPC_WS_URL = "wss://api.devnet.solana.com";
const DEVNET_INDEXER_URL = "https://utxo-indexer.api-devnet.umbraprivacy.com";
const MAINNET_INDEXER_URL = "https://utxo-indexer.api.umbraprivacy.com";

const WSOL_MINT = "So11111111111111111111111111111111111111112";
export const UMBRA_PROGRAM_ID = "UMBRAD2ishebJTcgCLkTkNUx1v3GyoAgpTRPeWoLykh";

export interface UmbraUtxoCreationResult {
  ok: boolean;
  utxoRef?: string;
  scanHint?: string;
  viewingKey?: string;
  createUtxoSignature?: string;
  createProofAccountSignature?: string;
  closeProofAccountSignature?: string;
  amountLamports?: string;
  recipient?: string;
  mint?: string;
  error?: string;
  skipped?: string;
}

export interface UmbraDirectDepositResult {
  ok: boolean;
  umbraRef?: string;
  queueSignature?: string;
  callbackSignature?: string;
  error?: string;
  skipped?: string;
}

type UmbraClient = Awaited<ReturnType<typeof getUmbraClient>>;
type ReceiverUtxoZkProver = Parameters<
  typeof getPublicBalanceToReceiverClaimableUtxoCreatorFunction
>[1]["zkProver"];

let _client: UmbraClient | null = null;
let _clientAddress: string | null = null;
let _registrationAttempted = false;
let _registrationOk = false;
let _zkProver: ReceiverUtxoZkProver | null = null;

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

async function getZkProver(): Promise<ReceiverUtxoZkProver | null> {
  if (_zkProver) return _zkProver;
  try {
    const assetProvider = getCdnZkAssetProvider();
    const prover = await getCreateReceiverClaimableUtxoFromPublicBalanceProver({ assetProvider });
    _zkProver = prover;
    console.log("[Umbra] ZK prover (CDN-backed) initialised for ReceiverClaimableUtxo");
    return prover;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] ZK prover unavailable (non-fatal): ${msg}`);
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
      console.log(`[Umbra] Platform authority ${ctx.address} already registered`);
    } else {
      console.log(`[Umbra] Platform authority ${ctx.address} registered — ${sigs.length} tx(s)`);
    }
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] Platform registration failed (non-fatal): ${msg}`);
    _registrationOk = false;
    return false;
  }
}

function randomU256Hex(): string {
  return crypto.randomBytes(32).toString("hex");
}

function deriveViewingKey(generationIndexHex: string, recipient: string): string {
  return crypto
    .createHash("sha256")
    .update(`umbra:viewing-key:${generationIndexHex}:${recipient}`)
    .digest("hex");
}

function deriveScanHint(generationIndexHex: string, recipient: string): string {
  return crypto
    .createHash("sha256")
    .update(`umbra:scan-hint:${generationIndexHex}:${recipient}`)
    .digest("hex")
    .slice(0, 32);
}

/**
 * Create a receiver-claimable UTXO. Only the on-chain registered owner of
 * `recipientAddress` can claim this UTXO into their encrypted balance.
 */
export async function createReceiverClaimableUtxo(
  recipientAddress: string,
  amountLamports: bigint,
): Promise<UmbraUtxoCreationResult> {
  const ctx = await getClient();
  if (!ctx) {
    return { ok: false, skipped: "Umbra client unavailable — PLATFORM_AUTHORITY_SECRET_KEY missing" };
  }

  await ensurePlatformRegistered();

  const zkProver = await getZkProver();
  if (!zkProver) {
    return { ok: false, skipped: "Umbra ZK prover unavailable — assets could not be fetched" };
  }

  const generationIndexHex = randomU256Hex();
  const viewingKey = deriveViewingKey(generationIndexHex, recipientAddress);
  const scanHint = deriveScanHint(generationIndexHex, recipientAddress);

  try {
    assertU64(amountLamports);

    const createUtxo = getPublicBalanceToReceiverClaimableUtxoCreatorFunction(
      { client: ctx.client },
      { zkProver },
    );

    console.log(
      `[Umbra] Creating receiver-claimable UTXO: ${Number(amountLamports) / LAMPORTS_PER_SOL} wSOL → ${recipientAddress}`,
    );

    const result: CreateUtxoFromPublicBalanceResult = await createUtxo({
      amount: amountLamports,
      destinationAddress: address(recipientAddress),
      mint: address(WSOL_MINT),
    });

    const utxoRef = `umbra:utxo:${result.createUtxoSignature.slice(0, 32)}`;
    console.log(`[Umbra] UTXO created: ${utxoRef} (sig=${result.createUtxoSignature})`);

    return {
      ok: true,
      utxoRef,
      scanHint,
      viewingKey,
      createUtxoSignature: result.createUtxoSignature,
      createProofAccountSignature: result.createProofAccountSignature,
      closeProofAccountSignature: result.closeProofAccountSignature,
      amountLamports: amountLamports.toString(),
      recipient: recipientAddress,
      mint: WSOL_MINT,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] UTXO creation failed (regular SOL payout still landed): ${msg}`);
    return {
      ok: false,
      error: msg,
      utxoRef: `umbra:pending:${generationIndexHex.slice(0, 16)}`,
      scanHint,
      viewingKey,
      amountLamports: amountLamports.toString(),
      recipient: recipientAddress,
      mint: WSOL_MINT,
    };
  }
}

/**
 * Direct deposit (no client claim required). Used as a fallback path by the
 * automated payout pipeline when a receiver UTXO is unsuitable.
 */
export async function sendUmbraPrivatePayout(
  recipientAddress: string,
  amountLamports: bigint,
): Promise<UmbraDirectDepositResult> {
  const ctx = await getClient();
  if (!ctx) {
    return { ok: false, skipped: "Umbra client unavailable" };
  }

  const registered = await ensurePlatformRegistered();
  if (!registered) {
    return { ok: false, skipped: "Platform authority not registered on Umbra" };
  }

  try {
    const depositFn = getPublicBalanceToEncryptedBalanceDirectDepositorFunction({ client: ctx.client });
    assertU64(amountLamports);

    const result: DepositResult = await depositFn(
      address(recipientAddress),
      address(WSOL_MINT),
      amountLamports,
    );

    const qSig = result.queueSignature;
    const cbSig = result.callbackSignature;
    const umbraRef = `umbra:deposit:${qSig.slice(0, 20)}`;

    console.log(`[Umbra] Direct deposit queued: ${umbraRef}`);

    return {
      ok: true,
      umbraRef,
      queueSignature: qSig,
      callbackSignature: cbSig,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`[Umbra] Direct deposit failed: ${msg}`);
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
    zkProverInitialised: !!_zkProver,
    privateMint: WSOL_MINT,
    supportedTokens: [WSOL_MINT],
    live: !!_client,
    description:
      "Private prediction-market payouts via Umbra ReceiverClaimableUTXO — winners claim into their encrypted balance using the browser ZK prover",
  };
}
