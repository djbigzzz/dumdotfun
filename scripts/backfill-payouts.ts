import { backfillResolvedMarkets } from "../server/services/market-payouts";

(async () => {
  console.log("[Backfill] Starting payout backfill for all resolved markets...");
  const result = await backfillResolvedMarkets();
  console.log("[Backfill] Done:", JSON.stringify(result, null, 2));
  process.exit(result.failed > 0 ? 1 : 0);
})().catch(err => {
  console.error("[Backfill] Fatal:", err);
  process.exit(1);
});
