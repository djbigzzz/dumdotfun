/**
 * Cloak Privacy Layer Integration (REAL @cloak.dev/sdk-devnet)
 *
 * Cloak is a UTXO-based shielded pool on Solana with Groth16 proofs.
 * dum.fun uses it for confidential prediction-market settlement: when a
 * winner takes a payout, the platform deposits the SOL into the Cloak
 * shielded pool and immediately performs a full withdrawal to the
 * recipient. The on-chain trail no longer reveals the recipient<->market
 * link or the payout amount in plaintext (it goes through the shielded
 * pool's UTXO commitments).
 *
 * Privacy guarantee is load-bearing: prediction-market whales who win
 * large positions don't want their P&L permanently indexed alongside
 * their wallet. Cloak's shielded pool breaks the public link.
 *
 * SDK:    @cloak.dev/sdk-devnet (devnet program Zc1k...)
 * Docs:   https://docs.cloak.ag
 * Track:  Cloak Privacy Track - Colosseum Frontier 2026 ($5K)
 */

import { Connection, Keypair, PublicKey } from "@solana/web3.js";

const DEVNET_RPC =
  process.env.SOLANA_DEVNET_RPC ||
  process.env.HELIUS_DEVNET_RPC ||
  (process.env.HELIUS_API_KEY
    ? `https://devnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.devnet.solana.com");

const CLOAK_RELAY_URL =
  process.env.CLOAK_RELAY_URL || "https://api.devnet.cloak.ag";

let _payerKeypair: Keypair | null = null;
function getPayerKeypair(): Keypair | null {
  if (_payerKeypair) return _payerKeypair;
  const raw =
    process.env.CLOAK_PAYER_SECRET_KEY ||
    process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (!raw) return null;
  try {
    const t = raw.trim();
    let bytes: Uint8Array;
    if (t.startsWith("[")) bytes = Uint8Array.from(JSON.parse(t));
    else if (t.includes(",")) bytes = new Uint8Array(t.split(",").map(Number));
    else bytes = new Uint8Array(Buffer.from(t, "base64"));
    if (bytes.length !== 64) {
      throw new Error(`payer key wrong length: ${bytes.length}, expected 64`);
    }
    _payerKeypair = Keypair.fromSecretKey(bytes);
    return _payerKeypair;
  } catch (e) {
    console.error("[Cloak] failed to parse payer secret key:", e);
    return null;
  }
}

let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) _connection = new Connection(DEVNET_RPC, "confirmed");
  return _connection;
}

export const CLOAK_CONFIG = {
  network: "devnet" as const,
  relayUrl: CLOAK_RELAY_URL,
  rpcUrl: DEVNET_RPC.includes("api-key")
    ? DEVNET_RPC.replace(/api-key=[^&]+/, "api-key=REDACTED")
    : DEVNET_RPC,
  programId: "Zc1kHfp4rajSMeASFDwFFgkHRjv7dFQuLheJoQus27h",
  package: "@cloak.dev/sdk-devnet",
  features: [
    "UTXO-based shielded pool with Groth16 proofs",
    "Confidential SOL transfers via deposit + full withdrawal",
    "Recipient/amount unlinkability through commitment hashing",
    "Devnet program Zc1k... with public relay api.devnet.cloak.ag",
  ],
  track: "Cloak Privacy Track - Colosseum Frontier 2026",
};

export interface ShieldedPayoutRequest {
  marketId: string;
  recipientWallet: string;
  amountSol: number;
  /**
   * Persistence hook called BEFORE the deposit transaction is broadcast.
   * Receives the ephemeral UTXO owner private key (as a decimal string)
   * so the caller can persist it to durable storage. If this throws, no
   * on-chain action is taken. This is the mechanism that makes a
   * deposit-succeeded/withdraw-failed crash recoverable instead of
   * silently locking funds inside the shielded pool.
   */
  onUtxoOwnerGenerated?: (privateKeyDecimal: string) => Promise<void> | void;
  /**
   * Persistence hook called as soon as the deposit transaction confirms
   * (before the withdraw is attempted). Receives the deposit signature
   * so the caller can record it durably for recovery/audit.
   */
  onDepositConfirmed?: (depositSignature: string) => Promise<void> | void;
}

export interface ShieldedPayoutResult {
  depositSignature: string;
  withdrawSignature: string;
  shieldedAmountLamports: string;
  recipient: string;
  marketId: string;
  programId: string;
  network: "devnet";
  explorerDeposit: string;
  explorerWithdraw: string;
  durationMs: number;
}

function explorerTxUrl(sig: string) {
  return `https://explorer.solana.com/tx/${sig}?cluster=devnet`;
}

/**
 * Execute a real Cloak shielded payout on devnet.
 * Flow: server payer deposits SOL into Cloak shield pool with a fresh
 * UTXO owner, then immediately fullWithdraws to the recipient. Both
 * transactions are submitted to Solana devnet via the Cloak relay.
 */
export async function executeShieldedPayout(
  req: ShieldedPayoutRequest
): Promise<ShieldedPayoutResult> {
  const payer = getPayerKeypair();
  if (!payer) {
    throw new Error(
      "CLOAK_PAYER_SECRET_KEY (or PLATFORM_AUTHORITY_SECRET_KEY) not configured"
    );
  }

  const lamports = BigInt(Math.floor(req.amountSol * 1_000_000_000));
  if (lamports <= BigInt(0)) throw new Error("amount must be positive");

  const recipient = new PublicKey(req.recipientWallet);
  const connection = getConnection();
  const start = Date.now();

  const sdk = await import("@cloak.dev/sdk-devnet");
  const {
    CLOAK_PROGRAM_ID,
    NATIVE_SOL_MINT,
    MIN_DEPOSIT_LAMPORTS,
    createUtxo,
    createZeroUtxo,
    fullWithdraw,
    generateUtxoKeypair,
    transact,
  } = sdk as any;

  if (lamports < BigInt(MIN_DEPOSIT_LAMPORTS)) {
    throw new Error(
      `amount below Cloak minimum deposit (${MIN_DEPOSIT_LAMPORTS} lamports)`
    );
  }

  const owner = await generateUtxoKeypair();
  // Persist owner secret BEFORE broadcasting deposit. If this hook throws,
  // we abort and no on-chain action happens. If it succeeds we have a
  // durable record of the UTXO ownership so a deposit-succeeded /
  // withdraw-failed crash can be recovered by replaying fullWithdraw.
  if (req.onUtxoOwnerGenerated) {
    await req.onUtxoOwnerGenerated(owner.privateKey.toString());
  }
  const depositOutput = await createUtxo(lamports, owner, NATIVE_SOL_MINT);

  const baseOpts = {
    connection,
    programId: CLOAK_PROGRAM_ID,
    relayUrl: CLOAK_RELAY_URL,
    depositorKeypair: payer,
    walletPublicKey: payer.publicKey,
  };

  console.log(
    `[Cloak] depositing ${lamports.toString()} lamports for market ${req.marketId.slice(0, 8)}...`
  );
  const deposited = await transact(
    {
      inputUtxos: [
        await createZeroUtxo(NATIVE_SOL_MINT),
        await createZeroUtxo(NATIVE_SOL_MINT),
      ],
      outputUtxos: [depositOutput, await createZeroUtxo(NATIVE_SOL_MINT)],
      externalAmount: lamports,
      depositor: payer.publicKey,
    },
    baseOpts
  );

  console.log(
    `[Cloak] deposit ok sig=${deposited.signature.slice(0, 12)}... withdrawing to ${recipient.toBase58().slice(0, 8)}...`
  );
  if (req.onDepositConfirmed) {
    await req.onDepositConfirmed(deposited.signature);
  }

  const withdrawn = await fullWithdraw(deposited.outputUtxos, recipient, {
    ...baseOpts,
    cachedMerkleTree: deposited.merkleTree,
  });

  const durationMs = Date.now() - start;
  console.log(
    `[Cloak] withdraw ok sig=${withdrawn.signature.slice(0, 12)}... total ${durationMs}ms`
  );

  return {
    depositSignature: deposited.signature,
    withdrawSignature: withdrawn.signature,
    shieldedAmountLamports: lamports.toString(),
    recipient: recipient.toBase58(),
    marketId: req.marketId,
    programId: CLOAK_PROGRAM_ID.toBase58(),
    network: "devnet",
    explorerDeposit: explorerTxUrl(deposited.signature),
    explorerWithdraw: explorerTxUrl(withdrawn.signature),
    durationMs,
  };
}

export function getCloakStatus() {
  const payer = getPayerKeypair();
  return {
    integrated: true,
    network: CLOAK_CONFIG.network,
    programId: CLOAK_CONFIG.programId,
    relayUrl: CLOAK_CONFIG.relayUrl,
    sdk: CLOAK_CONFIG.package,
    payerConfigured: !!payer,
    payerWallet: payer?.publicKey.toBase58(),
    features: CLOAK_CONFIG.features,
    useCases: [
      {
        name: "Confidential Market Payouts",
        description:
          "Prediction-market winnings route through Cloak's shielded pool: " +
          "the platform deposits the payout into a fresh UTXO and immediately " +
          "performs a full withdrawal to the winner. The on-chain trail no " +
          "longer links winner<->market<->amount in plaintext.",
        status: "live",
      },
      {
        name: "Encrypted Creator Fee Stream",
        description:
          "Bonding-curve creator fees can be batched through the same shielded " +
          "rail so launch revenue is private to the creator.",
        status: "integration-ready",
      },
    ],
    docs: "https://docs.cloak.ag",
    hackathonTrack: CLOAK_CONFIG.track,
  };
}
