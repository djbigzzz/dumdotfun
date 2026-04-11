import { useEffect } from "react";

const BASE_TITLE = "Dum.fun";

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Token Launchpad & Prediction Markets | Dum.fun",
    description: "The #1 privacy-first token launchpad and prediction market on Solana. Launch meme coins with bonding curves, bet on token survival. Free & fast.",
  },
  "/tokens": {
    title: "All Tokens — Browse & Trade Solana Meme Coins | Dum.fun",
    description: "Browse all launched tokens on Dum.fun. Trade Solana meme coins powered by bonding curves with real-time pricing and volume data.",
  },
  "/trending": {
    title: "Trending Tokens — Hottest Meme Coins on Solana | Dum.fun",
    description: "Discover the hottest trending tokens on Solana. See top movers by volume, market cap, and recent trades on Dum.fun.",
  },
  "/create": {
    title: "Launch a Token — Free Solana Token Creator | Dum.fun",
    description: "Create and launch your own SPL token on Solana in under 2 minutes. Free token creation with automatic bonding curves and Raydium migration.",
  },
  "/leaderboard": {
    title: "Leaderboard & Seasons — Compete for SOL Rewards | Dum.fun",
    description: "Compete in seasonal leaderboards on Dum.fun. Top 10 players earn SOL rewards. Earn points through quests, trading, and token creation.",
  },
  "/quests": {
    title: "Quests & Points — Earn Rewards on Solana | Dum.fun",
    description: "Complete quests to earn points, climb tiers, and unlock rewards on Dum.fun. Daily check-ins, trading milestones, and OG Card bonuses.",
  },
  "/docs": {
    title: "Documentation — How Dum.fun Works | Privacy Protocols & Tokenomics",
    description: "Learn about Dum.fun's 7 privacy protocols, bonding curves, Raydium migration, prediction markets, and the OG Card system.",
  },
  "/profile": {
    title: "Your Profile — Points, Quests & Portfolio | Dum.fun",
    description: "View your Dum.fun profile: points balance, quest progress, trading activity, and tier status.",
  },
};

export function usePageTitle(path?: string, dynamicTitle?: string) {
  useEffect(() => {
    const key = path || window.location.pathname;
    const meta = PAGE_META[key];

    if (dynamicTitle) {
      document.title = `${dynamicTitle} | ${BASE_TITLE}`;
    } else if (meta) {
      document.title = meta.title;
      const descTag = document.querySelector('meta[name="description"]');
      if (descTag) descTag.setAttribute("content", meta.description);
    }

    return () => {
      document.title = PAGE_META["/"]?.title || BASE_TITLE;
    };
  }, [path, dynamicTitle]);
}
