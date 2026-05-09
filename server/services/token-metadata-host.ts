// Self-hosted Metaplex-style metadata for our own tokens. Replaces the
// previous pump.fun IPFS uploader, which was both unreliable (random
// timeouts and 5xx) and a competitor service we should not depend on.
//
// The image bytes live in the `tokens.image_uri` column as a data: URL
// and are served by /api/token-image/:mint. The Metaplex JSON manifest
// is served by /api/token-metadata/:mint and is composed from the same
// row at request time, so changes to the row (description, links,
// image) propagate without re-uploading anything.

const DEFAULT_BASE_URL = "https://dum.fun";

function trimTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

/**
 * Resolve the public base URL we want external services (and the on-chain
 * URI) to point at. Prefers an explicitly configured value, falls back to
 * the request host, and finally to the production domain.
 */
export function getPublicBaseUrl(req?: {
  protocol?: string;
  get?: (h: string) => string | undefined;
  headers?: Record<string, string | string[] | undefined>;
}): string {
  const env = process.env.PUBLIC_BASE_URL;
  if (env && /^https?:\/\//.test(env)) return trimTrailingSlash(env);

  if (req) {
    const hostHeader =
      (req.get && req.get("host")) ||
      (req.headers && (req.headers["host"] as string));
    const proto =
      (req.get && req.get("x-forwarded-proto")) ||
      (req.headers && (req.headers["x-forwarded-proto"] as string)) ||
      req.protocol ||
      "https";
    if (hostHeader && typeof hostHeader === "string") {
      return trimTrailingSlash(`${proto}://${hostHeader}`);
    }
  }

  return DEFAULT_BASE_URL;
}

/**
 * Stable URI we hand to the on-chain bonding-curve `create` instruction.
 * Always under our control, no third-party uplinks.
 */
export function buildMetadataUri(mint: string, baseUrl: string): string {
  return `${trimTrailingSlash(baseUrl)}/api/token-metadata/${mint}`;
}

export function buildImageUri(mint: string, baseUrl: string): string {
  return `${trimTrailingSlash(baseUrl)}/api/token-image/${mint}`;
}
