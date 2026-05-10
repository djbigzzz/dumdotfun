/**
 * Encrypt FHE integration — dum.fun × Encrypt Protocol
 *
 * Submits encrypted bet amounts to the Encrypt pre-alpha gRPC executor on devnet.
 * Each private bet gets a real on-chain ciphertext identifier from the Encrypt network.
 *
 * SDK:      https://github.com/dwallet-labs/encrypt-pre-alpha
 * Protocol: REFHE (https://eprint.iacr.org/2025/1449)
 * Endpoint: pre-alpha-dev-1.encrypt.ika-network.net:443
 *
 * Pre-alpha note: No real encryption yet — all data stored as plaintext on-chain.
 * The SDK integration and ciphertext lifecycle (create → compute → decrypt) is real.
 */

import { createEncryptClient, Chain } from "@encrypt.xyz/pre-alpha-solana-client/grpc";

const ENCRYPT_GRPC_URL = "pre-alpha-dev-1.encrypt.ika-network.net:443";

const FHE_TYPE_UINT64 = 4;

export interface EncryptResult {
  ciphertextId: string;
  fheType: number;
  endpoint: string;
}

/**
 * Submit a bet amount as an FHE EUint64 ciphertext to the Encrypt network.
 *
 * Returns the on-chain ciphertext identifier (hex), or null if the gRPC call fails.
 * The caller should fall back to a deterministic reference ID on null.
 *
 * @param amountLamports  Bet amount in lamports (1 SOL = 1e9 lamports)
 * @param authorizedBytes 32-byte address that can use this ciphertext (program or wallet)
 */
export async function encryptBetAmount(
  amountLamports: bigint,
  authorizedBytes?: Buffer,
): Promise<EncryptResult | null> {
  const client = createEncryptClient(ENCRYPT_GRPC_URL);
  try {
    // Pre-alpha: ciphertextBytes = raw u64 little-endian (no encryption key required yet).
    const ciphertextBytes = Buffer.alloc(8);
    ciphertextBytes.writeBigUInt64LE(amountLamports);

    // authorized: which address/program can reference this ciphertext.
    const authorized = authorizedBytes ?? Buffer.alloc(32, 0);

    // networkEncryptionPublicKey: 32-byte key registered on-chain.
    // Pre-alpha accepts zeros — real key enforcement comes at mainnet.
    const networkEncryptionPublicKey = Buffer.alloc(32, 0);

    const result = await client.createInput({
      chain: Chain.Solana,
      inputs: [{ ciphertextBytes, fheType: FHE_TYPE_UINT64 }],
      proof: Buffer.alloc(0),
      authorized,
      networkEncryptionPublicKey,
    });

    if (result.ciphertextIdentifiers.length > 0) {
      const id = Buffer.from(result.ciphertextIdentifiers[0]).toString("hex");
      return {
        ciphertextId: id,
        fheType: FHE_TYPE_UINT64,
        endpoint: ENCRYPT_GRPC_URL,
      };
    }
    return null;
  } catch (err: any) {
    console.error("[Encrypt] gRPC createInput failed:", err?.message ?? err);
    return null;
  } finally {
    client.close();
  }
}

/**
 * Derive a deterministic fallback reference when the gRPC call is unavailable.
 * Format: enc_<hex of sha256(betId|amountLamports)>
 */
export function deriveLocalCiphertextRef(betId: string, amountLamports: bigint): string {
  const { createHash } = require("crypto") as typeof import("crypto");
  const hash = createHash("sha256")
    .update(`${betId}:${amountLamports}`)
    .digest("hex")
    .slice(0, 32);
  return `enc_${hash}`;
}
