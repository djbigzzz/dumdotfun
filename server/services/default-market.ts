import { storage } from "../storage";

export interface DefaultMarketTokenInput {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  creatorAddress: string;
}

/**
 * Idempotently create the default "Will $SYMBOL rug?" prediction market for
 * a token. Safe to call from any path that promotes a token to "deployed"
 * (devnet-confirm, the reconciler, backfill jobs, etc). Returns true if a
 * new market was created, false if one already existed or creation failed.
 */
export async function ensureDefaultRugMarket(
  token: DefaultMarketTokenInput,
): Promise<boolean> {
  try {
    const existing = await storage.getMarketsByTokenMint(token.mint);
    const alreadyHasDefault = existing.some(
      (m: any) =>
        m.predictionType === "survival" && m.survivalCriteria === "dev_sells",
    );
    if (alreadyHasDefault) return false;

    await storage.createMarket({
      question: `Will $${token.symbol} rug?`,
      description: `Will the ${token.name} creator dump 80%+ of the supply within 3 days? Resolved automatically by checking on-chain dev holdings.`,
      imageUri: token.imageUri,
      creatorAddress: token.creatorAddress,
      predictionType: "survival",
      tokenMint: token.mint,
      resolutionDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      survivalCriteria: "dev_sells",
    });
    console.log(
      `[default-market] auto-created "Will $${token.symbol} rug?" for ${token.mint}`,
    );
    return true;
  } catch (err) {
    console.error(
      `[default-market] failed for mint=${token.mint}:`,
      (err as any)?.message || err,
    );
    return false;
  }
}
