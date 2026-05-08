import sharp from "sharp";
import { db } from "../db";
import { tokens as tokensTable, predictionMarkets } from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

const W = 1200;
const H = 630;

const ALLOWED_REMOTE_HOSTS = new Set([
  "ipfs.io",
  "cloudflare-ipfs.com",
  "gateway.pinata.cloud",
  "nftstorage.link",
  "dweb.link",
  "arweave.net",
  "shdw-drive.genesysgo.net",
]);

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtMC(sol: number): string {
  if (!isFinite(sol) || sol <= 0) return "—";
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}K SOL`;
  return `${sol.toFixed(2)} SOL`;
}

function fmtPct(n: number): string {
  if (!isFinite(n)) return "0%";
  return `${Math.round(n)}%`;
}

function fmtTimeLeft(target: Date | null): string {
  if (!target) return "";
  const ms = target.getTime() - Date.now();
  if (ms <= 0) return "ended";
  const days = Math.floor(ms / 86_400_000);
  const hours = Math.floor((ms % 86_400_000) / 3_600_000);
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((ms % 3_600_000) / 60_000);
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
}

async function loadAvatar(uri: string | null): Promise<Buffer | null> {
  if (!uri) return null;
  try {
    let buf: Buffer | null = null;
    if (uri.startsWith("data:")) {
      const idx = uri.indexOf(",");
      if (idx < 0) return null;
      const header = uri.slice(5, idx);
      const isBase64 = header.toLowerCase().includes(";base64");
      buf = isBase64
        ? Buffer.from(uri.slice(idx + 1), "base64")
        : Buffer.from(decodeURIComponent(uri.slice(idx + 1)), "utf8");
    } else {
      const url = new URL(uri.startsWith("ipfs://") ? `https://ipfs.io/ipfs/${uri.slice(7)}` : uri);
      if (url.protocol !== "https:") return null;
      if (!ALLOWED_REMOTE_HOSTS.has(url.hostname.toLowerCase())) return null;
      const r = await fetch(url.toString(), { signal: AbortSignal.timeout(4000) });
      if (!r.ok) return null;
      const ct = (r.headers.get("content-type") || "").toLowerCase();
      if (!ct.startsWith("image/")) return null;
      const MAX_BYTES = 4 * 1024 * 1024;
      const cl = Number(r.headers.get("content-length"));
      if (Number.isFinite(cl) && cl > MAX_BYTES) return null;
      const ab = await r.arrayBuffer();
      if (ab.byteLength > MAX_BYTES) return null;
      buf = Buffer.from(ab);
    }
    if (!buf) return null;
    return await sharp(buf, { failOn: "none" })
      .resize(280, 280, { fit: "cover" })
      .png()
      .toBuffer();
  } catch {
    return null;
  }
}

export async function generateTokenOgImage(mint: string): Promise<Buffer | null> {
  const [token] = await db.select().from(tokensTable).where(eq(tokensTable.mint, mint)).limit(1);
  if (!token) return null;

  const name = (token.name || "Unknown Token").slice(0, 24);
  const symbol = (token.symbol || "???").toUpperCase().slice(0, 10);
  const mcSol = Number(token.marketCapSol) || 0;
  const progress = Math.max(0, Math.min(100, Number(token.bondingCurveProgress) || 0));
  const isGraduated = !!token.isGraduated;

  // Pick the most relevant market: highest-volume open one, else most recent.
  const markets = await db
    .select()
    .from(predictionMarkets)
    .where(eq(predictionMarkets.tokenMint, mint))
    .orderBy(desc(predictionMarkets.createdAt));
  const open = markets.filter((m) => m.status === "open");
  const sorted = (open.length ? open : markets).slice().sort(
    (a, b) => (Number(b.totalVolume) || 0) - (Number(a.totalVolume) || 0),
  );
  const top = sorted[0] || null;
  const extraCount = Math.max(0, markets.length - 1);

  let yesPct = 50;
  let noPct = 50;
  let topQ = "";
  let totalVol = 0;
  let timeLeft = "";
  if (top) {
    const yp = Number(top.yesPool) || 0;
    const np = Number(top.noPool) || 0;
    const total = yp + np;
    if (total > 0) {
      yesPct = (yp / total) * 100;
      noPct = 100 - yesPct;
    }
    topQ = (top.question || "").slice(0, 60);
    totalVol = Number(top.totalVolume) || 0;
    timeLeft = top.status === "open"
      ? fmtTimeLeft(top.resolutionDate ? new Date(top.resolutionDate) : null)
      : top.status === "resolved" ? "resolved" : "closed";
  }

  const avatarBuf = await loadAvatar(token.imageUri);
  const avatarHref = avatarBuf ? `data:image/png;base64,${avatarBuf.toString("base64")}` : null;

  const initial = (symbol[0] || name[0] || "?").toUpperCase();
  const progressBarW = 540;
  const filledW = Math.round((progress / 100) * progressBarW);
  const progressColor = isGraduated ? "#10b981" : progress >= 75 ? "#f59e0b" : "#fbbf24";

  const escName = escapeXml(name);
  const escSym = escapeXml(symbol);
  const escTopQ = escapeXml(topQ);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <clipPath id="avatarClip"><rect x="64" y="80" width="280" height="280" rx="20" ry="20"/></clipPath>
    <clipPath id="cardClip"><rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="28" ry="28"/></clipPath>
  </defs>
  <rect width="${W}" height="${H}" fill="#09090b"/>
  <g clip-path="url(#cardClip)">
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="#ffffff"/>
    <rect x="40" y="40" width="${W - 80}" height="${H - 80}" fill="none" stroke="#000" stroke-width="6"/>

    <!-- Avatar -->
    <g clip-path="url(#avatarClip)">
      ${avatarHref
        ? `<image href="${avatarHref}" x="64" y="80" width="280" height="280" preserveAspectRatio="xMidYMid slice"/>`
        : `<rect x="64" y="80" width="280" height="280" fill="#e4e4e7"/>
           <text x="204" y="260" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="160" font-weight="900" fill="#52525b" text-anchor="middle">${escapeXml(initial)}</text>`}
    </g>
    <rect x="64" y="80" width="280" height="280" rx="20" ry="20" fill="none" stroke="#000" stroke-width="4"/>

    <!-- Token name + symbol -->
    <text x="380" y="150" font-family="Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif" font-size="64" font-weight="900" fill="#09090b" textLength="${Math.min(680, escName.length * 38)}" lengthAdjust="spacingAndGlyphs">${escName}</text>
    <g>
      <rect x="380" y="178" width="${Math.min(260, 24 + escSym.length * 20)}" height="56" rx="10" ry="10" fill="#f4f4f5" stroke="#000" stroke-width="3"/>
      <text x="${380 + 12}" y="217" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" font-size="32" font-weight="800" fill="#27272a">$${escSym}</text>
    </g>

    <!-- Cap + Progress / Graduated badge -->
    <text x="380" y="290" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800" fill="#3f3f46">Cap:</text>
    <text x="465" y="290" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="900" fill="#16a34a">${escapeXml(fmtMC(mcSol))}</text>
    ${isGraduated
      ? `<g><rect x="700" y="262" width="200" height="38" rx="8" ry="8" fill="#10b981"/>
         <text x="800" y="289" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="900" fill="#fff" text-anchor="middle">GRADUATED</text></g>`
      : `<text x="700" y="290" font-family="Inter, system-ui, sans-serif" font-size="28" font-weight="800" fill="#3f3f46">Progress:</text>
         <text x="855" y="290" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="900" fill="#d97706">${fmtPct(progress)}</text>`}

    <!-- Progress bar -->
    <rect x="380" y="320" width="${progressBarW}" height="22" rx="11" ry="11" fill="#f4f4f5" stroke="#000" stroke-width="3"/>
    <rect x="380" y="320" width="${filledW}" height="22" rx="11" ry="11" fill="${progressColor}"/>

    <!-- Divider -->
    <line x1="80" y1="395" x2="${W - 80}" y2="395" stroke="#e4e4e7" stroke-width="2" stroke-dasharray="4 6"/>

    ${top ? `
    <!-- Hot prediction -->
    <text x="80" y="440" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="900" fill="#ef4444" letter-spacing="2">↗ HOT PREDICTION</text>
    <text x="80" y="488" font-family="Inter, system-ui, sans-serif" font-size="34" font-weight="900" fill="#09090b">${escTopQ}${topQ.length >= 60 ? "…" : ""}</text>

    <!-- YES box -->
    <rect x="80" y="510" width="490" height="78" rx="12" ry="12" fill="#dcfce7" stroke="#16a34a" stroke-width="3"/>
    <text x="160" y="545" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="900" fill="#15803d" text-anchor="middle">${fmtPct(yesPct)}</text>
    <text x="160" y="575" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="800" fill="#15803d" text-anchor="middle">YES</text>
    <rect x="200" y="525" width="358" height="50" rx="6" ry="6" fill="#16a34a" opacity="0.08"/>
    <text x="220" y="558" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" fill="#15803d">${totalVol > 0 ? `${totalVol.toFixed(2)} SOL VOL` : "no bets yet"}</text>

    <!-- NO box -->
    <rect x="${W - 80 - 490}" y="510" width="490" height="78" rx="12" ry="12" fill="#fee2e2" stroke="#dc2626" stroke-width="3"/>
    <text x="${W - 80 - 490 + 80}" y="545" font-family="Inter, system-ui, sans-serif" font-size="32" font-weight="900" fill="#b91c1c" text-anchor="middle">${fmtPct(noPct)}</text>
    <text x="${W - 80 - 490 + 80}" y="575" font-family="Inter, system-ui, sans-serif" font-size="18" font-weight="800" fill="#b91c1c" text-anchor="middle">NO</text>
    <text x="${W - 80 - 490 + 180}" y="558" font-family="Inter, system-ui, sans-serif" font-size="20" font-weight="700" fill="#b91c1c">${escapeXml(timeLeft || "")}${extraCount > 0 ? `   +${extraCount} more` : ""}</text>
    `
    : `
    <text x="80" y="455" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="800" fill="#71717a">No prediction markets yet</text>
    <text x="80" y="495" font-family="Inter, system-ui, sans-serif" font-size="22" font-weight="600" fill="#a1a1aa">Be the first to call it on Dum.fun</text>
    `}

    <!-- Branding (top-right) -->
    <text x="${W - 80}" y="125" font-family="Inter, system-ui, sans-serif" font-size="26" font-weight="900" fill="#09090b" text-anchor="end">dum.fun</text>
    <text x="${W - 80}" y="155" font-family="Inter, system-ui, sans-serif" font-size="16" font-weight="700" fill="#71717a" text-anchor="end">Solana launchpad + prediction markets</text>
  </g>
</svg>`;

  return await sharp(Buffer.from(svg, "utf8"))
    .resize(W, H)
    .png({ compressionLevel: 9 })
    .toBuffer();
}
