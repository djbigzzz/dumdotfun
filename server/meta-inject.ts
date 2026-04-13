import { db } from "./db";
import { tokens as tokensTable } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://dum.fun";
const DEFAULT_IMAGE = `${BASE_URL}/opengraph.jpg`;

interface PageMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  canonical?: string;
}

const STATIC_META: Record<string, PageMeta> = {
  "/": {
    title: "Token Launchpad & Prediction Markets | Dum.fun",
    description: "The #1 privacy-first token launchpad and prediction market on Solana. Launch meme coins with bonding curves, bet on token survival. Free & fast.",
    ogTitle: "Token Launchpad & Prediction Markets | Dum.fun",
    ogDescription: "The #1 token launchpad and prediction market on Solana. Launch meme coins instantly with bonding curves. Bet on token survival.",
    ogUrl: BASE_URL,
    canonical: BASE_URL,
  },
  "/tokens": {
    title: "All Tokens — Browse & Trade Solana Meme Coins | Dum.fun",
    description: "Browse all launched tokens on Dum.fun. Trade Solana meme coins powered by bonding curves with real-time pricing and volume data.",
    ogTitle: "All Tokens — Browse & Trade Solana Meme Coins | Dum.fun",
    ogDescription: "Browse and trade all launched Solana meme coins on Dum.fun. Real-time bonding curve prices, volume, and market cap.",
    ogUrl: `${BASE_URL}/tokens`,
    canonical: `${BASE_URL}/tokens`,
  },
  "/trending": {
    title: "Trending Tokens — Hottest Meme Coins on Solana | Dum.fun",
    description: "Discover the hottest trending tokens on Solana. See top movers by volume, market cap, and recent trades on Dum.fun.",
    ogTitle: "Trending Tokens — Hottest Meme Coins on Solana | Dum.fun",
    ogDescription: "Discover the hottest trending Solana meme coins by volume and market cap. Real-time rankings on Dum.fun.",
    ogUrl: `${BASE_URL}/trending`,
    canonical: `${BASE_URL}/trending`,
  },
  "/create": {
    title: "Launch a Token — Free Solana Token Creator | Dum.fun",
    description: "Create and launch your own SPL token on Solana in under 2 minutes. Free token creation with automatic bonding curves and Raydium migration.",
    ogTitle: "Launch a Solana Token for Free | Dum.fun",
    ogDescription: "Create your own SPL meme coin on Solana in under 2 minutes. Free, with automatic bonding curves and Raydium DEX migration at 85 SOL.",
    ogUrl: `${BASE_URL}/create`,
    canonical: `${BASE_URL}/create`,
  },
  "/leaderboard": {
    title: "Leaderboard & Seasons — Compete for SOL Rewards | Dum.fun",
    description: "Compete in seasonal leaderboards on Dum.fun. Top 10 players earn SOL rewards. Earn points through quests, trading, and token creation.",
    ogTitle: "Leaderboard — Compete & Earn on Dum.fun",
    ogDescription: "Climb the seasonal leaderboard on Dum.fun. Earn points through quests and trading. Top players earn SOL rewards.",
    ogUrl: `${BASE_URL}/leaderboard`,
    canonical: `${BASE_URL}/leaderboard`,
  },
  "/quests": {
    title: "Quests & Points — Earn Rewards on Solana | Dum.fun",
    description: "Complete quests to earn points, climb tiers, and unlock rewards on Dum.fun. Daily check-ins, trading milestones, and OG Card bonuses.",
    ogTitle: "Quests & Points — Earn Rewards on Dum.fun",
    ogDescription: "Complete daily quests to earn points and climb the leaderboard on Dum.fun. OG Card holders get 1.2x bonus.",
    ogUrl: `${BASE_URL}/quests`,
    canonical: `${BASE_URL}/quests`,
  },
  "/docs": {
    title: "Documentation — How Dum.fun Works | Privacy Protocols & Tokenomics",
    description: "Learn about Dum.fun's 7 privacy protocols, bonding curves, Raydium migration, prediction markets, and the OG Card system.",
    ogTitle: "Dum.fun Documentation — Privacy Protocols & How It Works",
    ogDescription: "Deep-dive into Dum.fun: bonding curves, Raydium migration, 7 privacy protocols, prediction markets, and the OG Card reward system.",
    ogUrl: `${BASE_URL}/docs`,
    canonical: `${BASE_URL}/docs`,
  },
  "/profile": {
    title: "Your Profile — Points, Quests & Portfolio | Dum.fun",
    description: "View your Dum.fun profile: points balance, quest progress, trading activity, and tier status.",
    ogTitle: "My Profile — Dum.fun",
    ogDescription: "View your trading portfolio, quest progress, points balance, and tier status on Dum.fun.",
    ogUrl: `${BASE_URL}/profile`,
    canonical: `${BASE_URL}/profile`,
  },
  "/search": {
    title: "Search Tokens | Dum.fun",
    description: "Search for Solana meme coins by name or symbol on Dum.fun.",
    ogTitle: "Search Tokens | Dum.fun",
    ogDescription: "Search and discover Solana meme coins on Dum.fun.",
    ogUrl: `${BASE_URL}/search`,
    canonical: `${BASE_URL}/search`,
  },
  "/legal/privacy": {
    title: "Privacy Policy | Dum.fun",
    description: "Privacy Policy for Dum.fun — the Solana token launchpad and prediction market.",
    ogTitle: "Privacy Policy | Dum.fun",
    ogDescription: "Privacy Policy for Dum.fun.",
    ogUrl: `${BASE_URL}/legal/privacy`,
    canonical: `${BASE_URL}/legal/privacy`,
  },
  "/legal/eula": {
    title: "Terms of Service | Dum.fun",
    description: "Terms of Service for Dum.fun — the Solana token launchpad and prediction market.",
    ogTitle: "Terms of Service | Dum.fun",
    ogDescription: "Terms of Service for Dum.fun.",
    ogUrl: `${BASE_URL}/legal/eula`,
    canonical: `${BASE_URL}/legal/eula`,
  },
};

async function getTokenMeta(mint: string): Promise<PageMeta | null> {
  try {
    const rows = await db.select().from(tokensTable).where(eq(tokensTable.mint, mint)).limit(1);
    if (!rows.length) return null;
    const token = rows[0];
    const name = token.name || "Unknown Token";
    const symbol = token.symbol || "???";
    const description = token.description
      ? `${token.description.slice(0, 120)}${token.description.length > 120 ? "..." : ""}`
      : `${name} ($${symbol}) — Trade on Solana`;
    const image = token.imageUri || DEFAULT_IMAGE;
    const url = `${BASE_URL}/token/${mint}`;

    return {
      title: `${name} ($${symbol}) — Trade on Solana | Dum.fun`,
      description: `${description} — MC: ${token.marketCapSol ? token.marketCapSol.toFixed(2) : "0"} SOL`,
      ogTitle: `${name} ($${symbol}) on Dum.fun`,
      ogDescription: `${description} — Bonding curve: ${Math.min(Number(token.bondingCurveProgress) || 0, 100).toFixed(0)}% — Market cap: ${token.marketCapSol ? token.marketCapSol.toFixed(2) : "0"} SOL`,
      ogImage: image,
      ogUrl: url,
      canonical: url,
    };
  } catch {
    return null;
  }
}

function setMeta(html: string, meta: PageMeta): string {
  const image = meta.ogImage || DEFAULT_IMAGE;

  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>${escapeHtml(meta.title)}</title>`,
  );

  html = replaceMeta(html, 'name="description"', `content="${escapeHtml(meta.description)}"`);
  html = replaceMeta(html, 'property="og:title"', `content="${escapeHtml(meta.ogTitle || meta.title)}"`);
  html = replaceMeta(html, 'property="og:description"', `content="${escapeHtml(meta.ogDescription || meta.description)}"`);
  html = replaceMeta(html, 'property="og:url"', `content="${escapeHtml(meta.ogUrl || BASE_URL)}"`);
  html = replaceMeta(html, 'property="og:image"', `content="${escapeHtml(image)}"`);
  html = replaceMeta(html, 'name="twitter:title"', `content="${escapeHtml(meta.ogTitle || meta.title)}"`);
  html = replaceMeta(html, 'name="twitter:description"', `content="${escapeHtml(meta.ogDescription || meta.description)}"`);
  html = replaceMeta(html, 'name="twitter:image"', `content="${escapeHtml(image)}"`);

  if (meta.canonical) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    );
  }

  return html;
}

function replaceMeta(html: string, attr: string, newContent: string): string {
  const re = new RegExp(`(<meta\\s[^>]*${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*?)content="[^"]*"([^>]*>)`, "i");
  const reReverse = new RegExp(`(<meta\\s[^>]*?)content="[^"]*"([^>]*${attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^>]*>)`, "i");

  if (re.test(html)) {
    return html.replace(re, `$1${newContent}$2`);
  }
  if (reReverse.test(html)) {
    return html.replace(reReverse, `$1${newContent}$2`);
  }
  return html;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

export async function injectMeta(html: string, pathname: string): Promise<string> {
  const tokenMatch = pathname.match(/^\/token\/([^/?#]+)/);
  if (tokenMatch) {
    const mint = tokenMatch[1];
    const meta = await getTokenMeta(mint);
    if (meta) return setMeta(html, meta);
    return html;
  }

  const cleanPath = pathname.split("?")[0].split("#")[0];
  const staticMeta = STATIC_META[cleanPath];
  if (staticMeta) return setMeta(html, staticMeta);

  return html;
}
