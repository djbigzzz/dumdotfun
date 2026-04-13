import { db } from "./db";
import { tokens as tokensTable, predictionMarkets } from "@shared/schema";
import { eq } from "drizzle-orm";

const BASE_URL = "https://dum.fun";
const DEFAULT_IMAGE = `${BASE_URL}/opengraph.jpg`;

interface PageMeta {
  title: string;
  description: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogImageAlt?: string;
  ogUrl?: string;
  canonical?: string;
  jsonLd?: object[];
}

const BREADCRUMB_BASE = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
};

function breadcrumb(items: { name: string; url: string }[]) {
  return {
    ...BREADCRUMB_BASE,
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

const STATIC_META: Record<string, PageMeta> = {
  "/": {
    title: "Token Launchpad & Prediction Markets | Dum.fun",
    description: "The #1 privacy-first token launchpad and prediction market on Solana. Launch meme coins with bonding curves, bet on token survival. Free & fast.",
    ogTitle: "Token Launchpad & Prediction Markets | Dum.fun",
    ogDescription: "The #1 token launchpad and prediction market on Solana. Launch meme coins instantly with bonding curves. Bet on token survival.",
    ogImageAlt: "Dum.fun — Solana Token Launchpad & Prediction Markets",
    ogUrl: BASE_URL,
    canonical: BASE_URL,
  },
  "/tokens": {
    title: "All Tokens — Browse & Trade Solana Meme Coins | Dum.fun",
    description: "Browse all launched tokens on Dum.fun. Trade Solana meme coins powered by bonding curves with real-time pricing and volume data.",
    ogTitle: "All Tokens — Browse & Trade Solana Meme Coins | Dum.fun",
    ogDescription: "Browse and trade all launched Solana meme coins on Dum.fun. Real-time bonding curve prices, volume, and market cap.",
    ogImageAlt: "All Solana meme coins on Dum.fun",
    ogUrl: `${BASE_URL}/tokens`,
    canonical: `${BASE_URL}/tokens`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "All Tokens", url: `${BASE_URL}/tokens` },
      ]),
    ],
  },
  "/trending": {
    title: "Trending Tokens — Hottest Meme Coins on Solana | Dum.fun",
    description: "Discover the hottest trending tokens on Solana. See top movers by volume, market cap, and recent trades on Dum.fun.",
    ogTitle: "Trending Tokens — Hottest Meme Coins on Solana | Dum.fun",
    ogDescription: "Discover the hottest trending Solana meme coins by volume and market cap. Real-time rankings on Dum.fun.",
    ogImageAlt: "Trending Solana meme coins on Dum.fun",
    ogUrl: `${BASE_URL}/trending`,
    canonical: `${BASE_URL}/trending`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Trending Tokens", url: `${BASE_URL}/trending` },
      ]),
    ],
  },
  "/create": {
    title: "Launch a Token — Free Solana Token Creator | Dum.fun",
    description: "Create and launch your own SPL token on Solana in under 2 minutes. Free token creation with automatic bonding curves and Raydium migration.",
    ogTitle: "Launch a Solana Token for Free | Dum.fun",
    ogDescription: "Create your own SPL meme coin on Solana in under 2 minutes. Free, with automatic bonding curves and Raydium DEX migration at 85 SOL.",
    ogImageAlt: "Launch your own Solana token on Dum.fun",
    ogUrl: `${BASE_URL}/create`,
    canonical: `${BASE_URL}/create`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Launch a Token", url: `${BASE_URL}/create` },
      ]),
    ],
  },
  "/leaderboard": {
    title: "Leaderboard & Seasons — Compete for SOL Rewards | Dum.fun",
    description: "Compete in seasonal leaderboards on Dum.fun. Top 10 players earn SOL rewards. Earn points through quests, trading, and token creation.",
    ogTitle: "Leaderboard — Compete & Earn on Dum.fun",
    ogDescription: "Climb the seasonal leaderboard on Dum.fun. Earn points through quests and trading. Top players earn SOL rewards.",
    ogImageAlt: "Dum.fun seasonal leaderboard rankings",
    ogUrl: `${BASE_URL}/leaderboard`,
    canonical: `${BASE_URL}/leaderboard`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Leaderboard", url: `${BASE_URL}/leaderboard` },
      ]),
    ],
  },
  "/quests": {
    title: "Quests & Points — Earn Rewards on Solana | Dum.fun",
    description: "Complete quests to earn points, climb tiers, and unlock rewards on Dum.fun. Daily check-ins, trading milestones, and OG Card bonuses.",
    ogTitle: "Quests & Points — Earn Rewards on Dum.fun",
    ogDescription: "Complete daily quests to earn points and climb the leaderboard on Dum.fun. OG Card holders get 1.2x bonus.",
    ogImageAlt: "Dum.fun quests and points rewards system",
    ogUrl: `${BASE_URL}/quests`,
    canonical: `${BASE_URL}/quests`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Quests & Points", url: `${BASE_URL}/quests` },
      ]),
    ],
  },
  "/docs": {
    title: "Documentation — How Dum.fun Works | Privacy Protocols & Tokenomics",
    description: "Learn about Dum.fun's 7 privacy protocols, bonding curves, Raydium migration, prediction markets, and the OG Card system.",
    ogTitle: "Dum.fun Documentation — Privacy Protocols & How It Works",
    ogDescription: "Deep-dive into Dum.fun: bonding curves, Raydium migration, 7 privacy protocols, prediction markets, and the OG Card reward system.",
    ogImageAlt: "Dum.fun documentation",
    ogUrl: `${BASE_URL}/docs`,
    canonical: `${BASE_URL}/docs`,
    jsonLd: [
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Documentation", url: `${BASE_URL}/docs` },
      ]),
    ],
  },
  "/profile": {
    title: "Your Profile — Points, Quests & Portfolio | Dum.fun",
    description: "View your Dum.fun profile: points balance, quest progress, trading activity, and tier status.",
    ogTitle: "My Profile — Dum.fun",
    ogDescription: "View your trading portfolio, quest progress, points balance, and tier status on Dum.fun.",
    ogImageAlt: "Your Dum.fun profile",
    ogUrl: `${BASE_URL}/profile`,
    canonical: `${BASE_URL}/profile`,
  },
  "/search": {
    title: "Search Tokens | Dum.fun",
    description: "Search for Solana meme coins by name or symbol on Dum.fun.",
    ogTitle: "Search Tokens | Dum.fun",
    ogDescription: "Search and discover Solana meme coins on Dum.fun.",
    ogImageAlt: "Search Solana tokens on Dum.fun",
    ogUrl: `${BASE_URL}/search`,
    canonical: `${BASE_URL}/search`,
  },
  "/legal/privacy": {
    title: "Privacy Policy | Dum.fun",
    description: "Privacy Policy for Dum.fun — the Solana token launchpad and prediction market.",
    ogTitle: "Privacy Policy | Dum.fun",
    ogDescription: "Privacy Policy for Dum.fun.",
    ogImageAlt: "Dum.fun Privacy Policy",
    ogUrl: `${BASE_URL}/legal/privacy`,
    canonical: `${BASE_URL}/legal/privacy`,
  },
  "/legal/eula": {
    title: "Terms of Service | Dum.fun",
    description: "Terms of Service for Dum.fun — the Solana token launchpad and prediction market.",
    ogTitle: "Terms of Service | Dum.fun",
    ogDescription: "Terms of Service for Dum.fun.",
    ogImageAlt: "Dum.fun Terms of Service",
    ogUrl: `${BASE_URL}/legal/eula`,
    canonical: `${BASE_URL}/legal/eula`,
  },
};

async function getMarketMeta(marketId: string): Promise<PageMeta | null> {
  try {
    const rows = await db.select().from(predictionMarkets).where(eq(predictionMarkets.id, marketId)).limit(1);
    if (!rows.length) return null;
    const market = rows[0];
    const question = market.question || "Prediction Market";
    const description = market.description
      ? `${market.description.slice(0, 120)}${market.description.length > 120 ? "..." : ""}`
      : question;
    const image = market.imageUri || DEFAULT_IMAGE;
    const url = `${BASE_URL}/market/${marketId}`;
    const totalVolume = Number(market.totalVolume) || 0;
    const yesPool = Number(market.yesPool) || 0;
    const noPool = Number(market.noPool) || 0;
    const status = market.status === "open" ? "Open" : market.status === "resolved" ? "Resolved" : "Closed";

    const jsonLd: object[] = [
      {
        "@context": "https://schema.org",
        "@type": "Event",
        name: question,
        description: `${description} — ${status} prediction market on Dum.fun.`,
        url,
        image,
        eventStatus: market.status === "open"
          ? "https://schema.org/EventScheduled"
          : "https://schema.org/EventCancelled",
        startDate: market.createdAt ? new Date(market.createdAt).toISOString() : undefined,
        endDate: market.resolutionDate ? new Date(market.resolutionDate).toISOString() : undefined,
        organizer: {
          "@type": "Organization",
          name: "Dum.fun",
          url: BASE_URL,
        },
      },
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "Tokens", url: `${BASE_URL}/tokens` },
        { name: question.slice(0, 60), url },
      ]),
    ];

    return {
      title: `${question} | Prediction Market on Dum.fun`,
      description: `${description} — ${status} · ${totalVolume.toFixed(2)} SOL volume`,
      ogTitle: `${question} | Dum.fun Prediction Market`,
      ogDescription: `${description} — ${status} prediction market. Yes pool: ${yesPool.toFixed(2)} SOL · No pool: ${noPool.toFixed(2)} SOL`,
      ogImage: image,
      ogImageAlt: `${question} — Dum.fun prediction market`,
      ogUrl: url,
      canonical: url,
      jsonLd,
    };
  } catch {
    return null;
  }
}

async function getTokenMeta(mint: string): Promise<PageMeta | null> {
  try {
    const rows = await db.select().from(tokensTable).where(eq(tokensTable.mint, mint)).limit(1);
    if (!rows.length) return null;
    const token = rows[0];
    const name = token.name || "Unknown Token";
    const symbol = token.symbol || "???";
    const description = token.description
      ? `${token.description.slice(0, 120)}${token.description.length > 120 ? "..." : ""}`
      : `${name} ($${symbol}) is a Solana meme coin on Dum.fun`;
    const image = token.imageUri || DEFAULT_IMAGE;
    const url = `${BASE_URL}/token/${mint}`;
    const mcSol = Number(token.marketCapSol) || 0;
    const progress = Math.min(Number(token.bondingCurveProgress) || 0, 100);
    const price = Number(token.priceInSol) || 0;

    const jsonLd: object[] = [
      {
        "@context": "https://schema.org",
        "@type": "FinancialProduct",
        name: `${name} (${symbol})`,
        alternateName: `$${symbol}`,
        description: `${description} — Bonding curve: ${progress.toFixed(0)}% · Market cap: ${mcSol.toFixed(4)} SOL`,
        url,
        image,
        offers: {
          "@type": "Offer",
          priceCurrency: "SOL",
          price: price.toFixed(9),
          availability: token.isGraduated
            ? "https://schema.org/InStock"
            : "https://schema.org/PreOrder",
          seller: {
            "@type": "Organization",
            name: "Dum.fun",
            url: BASE_URL,
          },
        },
        provider: {
          "@type": "Organization",
          name: "Dum.fun",
          url: BASE_URL,
        },
        additionalProperty: [
          { "@type": "PropertyValue", name: "Mint Address", value: mint },
          { "@type": "PropertyValue", name: "Bonding Curve Progress", value: `${progress.toFixed(0)}%` },
          { "@type": "PropertyValue", name: "Market Cap (SOL)", value: mcSol.toFixed(4) },
          { "@type": "PropertyValue", name: "Network", value: "Solana" },
          { "@type": "PropertyValue", name: "Status", value: token.isGraduated ? "Graduated to Raydium" : "Bonding Curve" },
        ],
      },
      breadcrumb([
        { name: "Dum.fun", url: BASE_URL },
        { name: "All Tokens", url: `${BASE_URL}/tokens` },
        { name: `${name} ($${symbol})`, url },
      ]),
    ];

    return {
      title: `${name} ($${symbol}) — Trade on Solana | Dum.fun`,
      description: `${description} — MC: ${mcSol.toFixed(2)} SOL · Bonding curve ${progress.toFixed(0)}% full`,
      ogTitle: `${name} ($${symbol}) on Dum.fun`,
      ogDescription: `${description} — Bonding curve: ${progress.toFixed(0)}% full · Market cap: ${mcSol.toFixed(2)} SOL`,
      ogImage: image,
      ogImageAlt: `${name} ($${symbol}) token on Dum.fun`,
      ogUrl: url,
      canonical: url,
      jsonLd,
    };
  } catch {
    return null;
  }
}

function setMeta(html: string, meta: PageMeta): string {
  const image = meta.ogImage || DEFAULT_IMAGE;
  const imageAlt = meta.ogImageAlt || meta.ogTitle || meta.title;

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

  // Inject og:image:alt and twitter:image:alt (insert after og:image tag)
  if (!html.includes('property="og:image:alt"')) {
    html = html.replace(
      /(<meta\s[^>]*property="og:image"[^>]*>)/i,
      `$1\n    <meta property="og:image:alt" content="${escapeHtml(imageAlt)}" />`,
    );
  } else {
    html = replaceMeta(html, 'property="og:image:alt"', `content="${escapeHtml(imageAlt)}"`);
  }

  if (!html.includes('name="twitter:image:alt"')) {
    html = html.replace(
      /(<meta\s[^>]*name="twitter:image"[^>]*>)/i,
      `$1\n    <meta name="twitter:image:alt" content="${escapeHtml(imageAlt)}" />`,
    );
  } else {
    html = replaceMeta(html, 'name="twitter:image:alt"', `content="${escapeHtml(imageAlt)}"`);
  }

  if (meta.canonical) {
    html = html.replace(
      /<link rel="canonical"[^>]*>/,
      `<link rel="canonical" href="${escapeHtml(meta.canonical)}" />`,
    );
  }

  if (meta.jsonLd && meta.jsonLd.length > 0) {
    const scripts = meta.jsonLd
      .map(ld => `<script type="application/ld+json">\n${JSON.stringify(ld, null, 2)}\n</script>`)
      .join("\n    ");
    html = html.replace("</head>", `    ${scripts}\n  </head>`);
  }

  return html;
}

function replaceMeta(html: string, attr: string, newContent: string): string {
  const escaped = attr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(<meta\\s[^>]*${escaped}[^>]*?)content="[^"]*"([^>]*>)`, "i");
  const reReverse = new RegExp(`(<meta\\s[^>]*?)content="[^"]*"([^>]*${escaped}[^>]*>)`, "i");

  if (re.test(html)) return html.replace(re, `$1${newContent}$2`);
  if (reReverse.test(html)) return html.replace(reReverse, `$1${newContent}$2`);
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
  const cleanPath = pathname.split("?")[0].split("#")[0];

  const tokenMatch = cleanPath.match(/^\/token\/([^/?#]+)/);
  if (tokenMatch) {
    const mint = tokenMatch[1];
    const meta = await getTokenMeta(mint);
    if (meta) return setMeta(html, meta);
    return html;
  }

  const marketMatch = cleanPath.match(/^\/market\/([^/?#]+)/);
  if (marketMatch) {
    const marketId = marketMatch[1];
    const meta = await getMarketMeta(marketId);
    if (meta) return setMeta(html, meta);
    return html;
  }

  const staticMeta = STATIC_META[cleanPath];
  if (staticMeta) return setMeta(html, staticMeta);

  return html;
}
