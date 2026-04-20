import type { Request, Response, NextFunction } from "express";
import { randomBytes } from "crypto";
import nacl from "tweetnacl";
import bs58Module from "bs58";
const bs58 = ((bs58Module as any).default ?? bs58Module) as { encode: (b: Uint8Array) => string; decode: (s: string) => Uint8Array };
const bs58Decode = bs58.decode;

const NONCE_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type NonceEntry = { nonce: string; expiresAt: number };
type SessionEntry = { walletAddress: string; expiresAt: number };

const nonces = new Map<string, NonceEntry>();
const sessions = new Map<string, SessionEntry>();

function sweep() {
  const now = Date.now();
  nonces.forEach((v, k) => { if (v.expiresAt < now) nonces.delete(k); });
  sessions.forEach((v, k) => { if (v.expiresAt < now) sessions.delete(k); });
}
setInterval(sweep, 60_000).unref?.();

export function buildSiwsMessage(walletAddress: string, nonce: string): string {
  return [
    "dum.fun wants you to sign in with your Solana account:",
    walletAddress,
    "",
    "Sign this message to prove you control this wallet. This is free and will not send a transaction.",
    "",
    `Nonce: ${nonce}`,
  ].join("\n");
}

export function createNonce(walletAddress: string): string {
  const nonce = randomBytes(16).toString("hex");
  nonces.set(walletAddress, { nonce, expiresAt: Date.now() + NONCE_TTL_MS });
  return nonce;
}

export function verifyAndCreateSession(
  walletAddress: string,
  signatureBase64: string,
): { token: string; expiresAt: number } | { error: string } {
  const entry = nonces.get(walletAddress);
  if (!entry || entry.expiresAt < Date.now()) {
    return { error: "Nonce expired or missing. Request a new one." };
  }
  const message = buildSiwsMessage(walletAddress, entry.nonce);
  const messageBytes = new TextEncoder().encode(message);

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = Uint8Array.from(Buffer.from(signatureBase64, "base64"));
  } catch {
    return { error: "Invalid signature encoding" };
  }

  let publicKeyBytes: Uint8Array;
  try {
    publicKeyBytes = bs58Decode(walletAddress);
  } catch {
    return { error: "Invalid wallet address" };
  }
  if (publicKeyBytes.length !== 32) return { error: "Invalid public key length" };
  if (signatureBytes.length !== 64) return { error: "Invalid signature length" };

  const ok = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
  if (!ok) return { error: "Signature verification failed" };

  // One-time-use nonce
  nonces.delete(walletAddress);

  const token = randomBytes(32).toString("hex");
  const expiresAt = Date.now() + SESSION_TTL_MS;
  sessions.set(token, { walletAddress, expiresAt });
  return { token, expiresAt };
}

export function getSessionWallet(token: string | undefined | null): string | null {
  if (!token) return null;
  const entry = sessions.get(token);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return entry.walletAddress;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

declare global {
  namespace Express {
    interface Request {
      authedWallet?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const h = req.headers["authorization"];
  if (typeof h === "string" && h.startsWith("Bearer ")) return h.slice(7).trim();
  return null;
}

export function attachSession(req: Request, _res: Response, next: NextFunction) {
  const wallet = getSessionWallet(extractToken(req));
  if (wallet) req.authedWallet = wallet;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const wallet = getSessionWallet(extractToken(req));
  if (!wallet) {
    return res.status(401).json({ error: "Sign in with your wallet to continue" });
  }
  req.authedWallet = wallet;
  next();
}

/**
 * For routes that take a walletAddress in the body and operate on that wallet's
 * data — ensures the body wallet matches the authenticated session wallet.
 */
export function requireAuthWithMatchingWallet(bodyKey: string = "walletAddress") {
  return (req: Request, res: Response, next: NextFunction) => {
    const sessionWallet = getSessionWallet(extractToken(req));
    if (!sessionWallet) {
      return res.status(401).json({ error: "Sign in with your wallet to continue" });
    }
    const bodyWallet = req.body?.[bodyKey];
    if (bodyWallet && bodyWallet !== sessionWallet) {
      return res.status(403).json({ error: "Wallet does not match signed-in session" });
    }
    req.authedWallet = sessionWallet;
    if (!bodyWallet) req.body = { ...(req.body || {}), [bodyKey]: sessionWallet };
    next();
  };
}
