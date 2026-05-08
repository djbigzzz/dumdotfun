import { PublicKey } from "@solana/web3.js";
import { getConnection } from "../helius-rpc";
import { storage } from "../storage";
import * as bondingCurve from "../bonding-curve-client";

const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
);

function getMetadataPDA(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("metadata"),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID,
  );
  return pda;
}

function readBorshString(buf: Buffer, offset: number): { value: string; next: number } {
  if (offset + 4 > buf.length) return { value: "", next: offset };
  const len = buf.readUInt32LE(offset);
  const start = offset + 4;
  const end = Math.min(start + len, buf.length);
  const raw = buf.slice(start, end).toString("utf8");
  return { value: raw.replace(/\0+$/g, "").trim(), next: end };
}

export interface OnChainMetadata {
  name: string;
  symbol: string;
  uri: string;
}

export async function fetchOnChainMetadata(
  mint: PublicKey,
): Promise<OnChainMetadata | null> {
  try {
    const connection = getConnection();
    const pda = getMetadataPDA(mint);
    const accountInfo = await connection.getAccountInfo(pda);
    if (!accountInfo) return null;
    const data = accountInfo.data;
    // Layout: 1 (key) + 32 (update_authority) + 32 (mint) = 65, then Data:
    //   string name (u32 len + bytes), string symbol, string uri
    let offset = 1 + 32 + 32;
    const name = readBorshString(data, offset);
    offset = name.next;
    const symbol = readBorshString(data, offset);
    offset = symbol.next;
    const uri = readBorshString(data, offset);
    return { name: name.value, symbol: symbol.value, uri: uri.value };
  } catch {
    return null;
  }
}

// Only allow https URLs and a small set of public storage hosts. The metadata
// URI comes from on-chain data controlled by the token creator, so without
// this check an attacker could point it at an internal/private address and
// turn the recovery path into an SSRF probe.
const ALLOWED_METADATA_HOSTS = new Set([
  "ipfs.io",
  "cloudflare-ipfs.com",
  "gateway.pinata.cloud",
  "nftstorage.link",
  "dweb.link",
  "arweave.net",
  "shdw-drive.genesysgo.net",
]);

function safeMetadataUrl(uri: string): string | null {
  if (!uri) return null;
  let url: URL;
  try {
    const raw = uri.startsWith("ipfs://")
      ? `https://ipfs.io/ipfs/${uri.slice("ipfs://".length)}`
      : uri;
    url = new URL(raw);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  if (!ALLOWED_METADATA_HOSTS.has(url.hostname.toLowerCase())) return null;
  return url.toString();
}

async function fetchMetadataJson(uri: string): Promise<{
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
} | null> {
  const safeUrl = safeMetadataUrl(uri);
  if (!safeUrl) return null;
  try {
    const res = await fetch(safeUrl, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get("content-type") || "";
    if (!ct.toLowerCase().includes("json")) return null;
    return (await res.json()) as any;
  } catch {
    return null;
  }
}

// In-memory negative cache so a flood of requests for nonexistent / non-dum.fun
// mints can't hammer the RPC. Cleared on process restart.
const NEGATIVE_CACHE = new Map<string, number>();
const NEGATIVE_TTL_MS = 60_000;

/**
 * Recover an orphaned dum.fun token: a mint that has a bonding-curve account
 * owned by our program but no row in the tokens table (e.g. because the
 * /devnet/confirm-create call never landed after the on-chain deploy
 * succeeded). Reads on-chain Metaplex metadata + bonding curve creator and
 * inserts a tokens row so it shows up correctly across the app.
 *
 * Returns the (newly inserted or already existing) token row, or null if the
 * mint is not actually a dum.fun bonding-curve token.
 */
// Detect placeholder rows previously written by older versions of this
// recovery code (name = "Token <first 4 of mint>", symbol = first 4 of mint
// uppercased, no image). When we encounter one of these we re-attempt the
// metadata read so the row gets upgraded once on-chain metadata is readable.
export function isPlaceholderRow(row: { name: string; symbol: string; imageUri: string | null }, mintStr: string): boolean {
  const prefix = mintStr.slice(0, 4);
  return (
    !row.imageUri &&
    row.name === `Token ${prefix}` &&
    row.symbol === prefix.toUpperCase()
  );
}

export async function recoverOrphanedToken(mintStr: string) {
  try {
    const existing = await storage.getTokenByMint(mintStr);
    // If we already have a real (non-placeholder) row, return it as-is.
    if (existing && !isPlaceholderRow(existing as any, mintStr)) return existing;

    const negTs = NEGATIVE_CACHE.get(mintStr);
    if (negTs && Date.now() - negTs < NEGATIVE_TTL_MS) return existing ?? null;

    const mintPubkey = new PublicKey(mintStr);
    const curve = await bondingCurve.fetchBondingCurveData(mintPubkey);
    if (!curve) {
      NEGATIVE_CACHE.set(mintStr, Date.now());
      return existing ?? null; // Not a dum.fun bonding-curve token
    }

    const meta = await fetchOnChainMetadata(mintPubkey);
    const json = meta?.uri ? await fetchMetadataJson(meta.uri) : null;

    // Require *real* metadata before publishing the token. Without this we
    // were polluting the public Explore feed with rows like "Token 1ph6 /
    // $1PH6 / no image" that confuse users and look like a broken launch.
    const realName = (meta?.name || json?.name || "").trim().slice(0, 64);
    const realSymbol = (meta?.symbol || json?.symbol || "").trim().toUpperCase().slice(0, 10);
    if (!realName || !realSymbol) {
      NEGATIVE_CACHE.set(mintStr, Date.now());
      return existing ?? null;
    }

    const imageUri = json?.image || null;
    const description = (json?.description || "").slice(0, 500) || null;

    if (existing && isPlaceholderRow(existing as any, mintStr)) {
      // Upgrade the previously-inserted placeholder row in place.
      const { db } = await import("../db");
      const { tokens: tokensTable } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      const [updated] = await db
        .update(tokensTable)
        .set({
          name: realName,
          symbol: realSymbol,
          description,
          imageUri,
          twitter: json?.twitter ?? null,
          telegram: json?.telegram ?? null,
          website: json?.website ?? null,
        })
        .where(eq(tokensTable.mint, mintStr))
        .returning();
      console.log(`[OrphanRecovery] Upgraded placeholder row ${realSymbol} (${mintStr})`);
      try {
        const { awardQuest } = await import("./points");
        await awardQuest(curve.creator, "first_token");
      } catch (e) { console.error("[OrphanRecovery] first_token award failed:", e); }
      return updated ?? existing;
    }

    // Race-safe re-check: another request may have just inserted it.
    const recheck = await storage.getTokenByMint(mintStr);
    if (recheck && !isPlaceholderRow(recheck as any, mintStr)) return recheck;

    try {
      const inserted = await storage.createToken({
        mint: mintStr,
        name: realName,
        symbol: realSymbol,
        description,
        imageUri,
        creatorAddress: curve.creator,
        twitter: json?.twitter ?? null,
        telegram: json?.telegram ?? null,
        website: json?.website ?? null,
      });
      console.log(`[OrphanRecovery] Imported orphaned token ${realSymbol} (${mintStr})`);
      try {
        const { awardQuest } = await import("./points");
        await awardQuest(curve.creator, "first_token");
      } catch (e) { console.error("[OrphanRecovery] first_token award failed:", e); }
      return inserted;
    } catch (insertErr: any) {
      // Unique-mint race: another concurrent recovery won. Re-read and return.
      const after = await storage.getTokenByMint(mintStr);
      if (after) return after;
      console.error(`[OrphanRecovery] Insert failed for ${mintStr}:`, insertErr?.message || insertErr);
      return null;
    }
  } catch (err: any) {
    console.error(`[OrphanRecovery] Failed for ${mintStr}:`, err?.message || err);
    return null;
  }
}
