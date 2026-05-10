import { Connection, PublicKey } from "@solana/web3.js";
import { createHash } from "crypto";

const SNS_PROGRAM_ID = new PublicKey("namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX");
const ROOT_TLD = new PublicKey("58PwtjSDuFHuUkYjH9BYnnQKHfwo9reZhC2zMJv9JPkx");
const REVERSE_LOOKUP_CLASS = new PublicKey("33m47vH6Eav6jr5Ry86XjhRft2jRBLDnDgPSHoquXi2Z");
const HASH_PREFIX = "SPL Name Service";

const SNS_RPC =
  process.env.SNS_RPC_URL ||
  (process.env.HELIUS_API_KEY
    ? `https://mainnet.helius-rpc.com/?api-key=${process.env.HELIUS_API_KEY}`
    : "https://api.mainnet-beta.solana.com");
const connection = new Connection(SNS_RPC, "confirmed");

interface CacheEntry {
  value: string | null;
  expiresAt: number;
}

const resolveCache = new Map<string, CacheEntry>();
const lookupCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000;

function getCached(cache: Map<string, CacheEntry>, key: string): string | null | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value;
}

function setCache(cache: Map<string, CacheEntry>, key: string, value: string | null): void {
  cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
}

function hashName(input: string): Buffer {
  return createHash("sha256").update(HASH_PREFIX + input).digest();
}

async function getNameAccountKey(
  hashed: Buffer,
  nameClass: PublicKey | null,
  parentName: PublicKey | null
): Promise<PublicKey> {
  const seeds = [
    hashed,
    nameClass ? nameClass.toBuffer() : Buffer.alloc(32),
    parentName ? parentName.toBuffer() : Buffer.alloc(32),
  ];
  const [key] = await PublicKey.findProgramAddress(seeds, SNS_PROGRAM_ID);
  return key;
}

async function getDomainKey(name: string): Promise<PublicKey> {
  return getNameAccountKey(hashName(name), null, ROOT_TLD);
}

async function getReverseLookupKey(pubkey: PublicKey): Promise<PublicKey> {
  return getNameAccountKey(hashName(pubkey.toBase58()), REVERSE_LOOKUP_CLASS, null);
}

function parseNameAccountData(data: Buffer): { parentName: PublicKey; owner: PublicKey; data: Buffer } {
  if (data.length < 96) throw new Error("Invalid name account data");
  return {
    parentName: new PublicKey(data.slice(0, 32)),
    owner: new PublicKey(data.slice(32, 64)),
    data: data.slice(96),
  };
}

export async function resolveAddress(address: string): Promise<string | null> {
  const cached = getCached(resolveCache, address);
  if (cached !== undefined) return cached;

  try {
    const publicKey = new PublicKey(address);
    const reverseLookupKey = await getReverseLookupKey(publicKey);
    const accountInfo = await connection.getAccountInfo(reverseLookupKey);
    if (!accountInfo) {
      setCache(resolveCache, address, null);
      return null;
    }
    const parsed = parseNameAccountData(accountInfo.data);
    const len = parsed.data.readUInt32LE(0);
    const domainName = parsed.data.slice(4, 4 + len).toString("utf8");
    const result = `${domainName}.sol`;
    setCache(resolveCache, address, result);
    return result;
  } catch (err) {
    console.warn("[SNS] resolveAddress failed:", (err as Error).message);
    setCache(resolveCache, address, null);
    return null;
  }
}

export async function lookupDomain(domain: string): Promise<string | null> {
  const normalized = domain.toLowerCase().replace(/\.sol$/, "");
  const cacheKey = `${normalized}.sol`;

  const cached = getCached(lookupCache, cacheKey);
  if (cached !== undefined) return cached;

  try {
    const domainKey = await getDomainKey(normalized);
    const accountInfo = await connection.getAccountInfo(domainKey);
    if (!accountInfo) {
      setCache(lookupCache, cacheKey, null);
      return null;
    }
    const parsed = parseNameAccountData(accountInfo.data);
    const result = parsed.owner.toBase58();
    setCache(lookupCache, cacheKey, result);
    return result;
  } catch (err) {
    console.warn("[SNS] lookupDomain failed:", (err as Error).message);
    setCache(lookupCache, cacheKey, null);
    return null;
  }
}
