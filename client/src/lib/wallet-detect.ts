/**
 * Safe Phantom-provider detection.
 *
 * Why this exists: every Solana wallet extension tries to inject itself onto
 * `window.solana`. When Backpack, Solflare or Glow boot first, they own the
 * property and Phantom can't redefine it - any call we make to `window.solana`
 * actually hits another wallet, and any attempt to overwrite it throws
 * "TypeError: Cannot redefine property: solana", which Phantom logs to
 * console and which causes our SIWS auth to silently fail on every refresh.
 *
 * Phantom's own docs recommend reading from `window.phantom.solana` first,
 * which is namespaced to Phantom and never collides with other wallets.
 * We fall back to `window.solana` only when it identifies itself as Phantom
 * AND no other phantom-namespaced provider exists.
 *
 * All accesses are wrapped in try/catch because reading `window.solana` on
 * a page where another extension has booby-trapped the getter can itself
 * throw before we get a chance to inspect the object.
 */

type AnyPhantom = any;

function safeGet<T>(fn: () => T | undefined): T | undefined {
  try {
    return fn();
  } catch {
    return undefined;
  }
}

/**
 * Returns the Phantom provider object if available, or null otherwise.
 * Always prefer this over reading `window.solana` directly.
 */
export function getPhantom(): AnyPhantom | null {
  if (typeof window === "undefined") return null;

  const namespaced = safeGet(() => (window as any).phantom?.solana);
  if (namespaced && namespaced.isPhantom) return namespaced;

  const legacy = safeGet(() => (window as any).solana);
  if (legacy && legacy.isPhantom) return legacy;

  return null;
}

export function hasPhantom(): boolean {
  return getPhantom() != null;
}

/**
 * Returns the connected wallet's public key as a base58 string, if any.
 * Safe to call before/after install or when other wallets are fighting over
 * the global object.
 */
export function getPhantomPublicKey(): string | null {
  const phantom = getPhantom();
  const pk = safeGet(() => phantom?.publicKey);
  if (!pk) return null;
  try {
    return typeof pk.toString === "function" ? pk.toString() : null;
  } catch {
    return null;
  }
}
