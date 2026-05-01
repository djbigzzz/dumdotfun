// Dry-run: lists every resolved market, every winner, and what they'd be
// paid. Reads only - never sends SOL or inserts rows. Run with:
//   npx tsx scripts/payouts-audit.ts
import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { computePayoutsForMarket } from "../server/services/market-payouts";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

async function main() {
  const markets: any = await db.execute(sql`
    SELECT id, question, outcome, total_volume FROM prediction_markets
    WHERE status = 'resolved' AND outcome IS NOT NULL
    ORDER BY resolved_at
  `);
  console.log(`Found ${markets.rows.length} resolved markets\n`);
  let totalLamports = 0n;
  let positionsCount = 0;
  const perWallet = new Map<string, bigint>();
  const alreadyPaid: any = await db.execute(sql`
    SELECT position_id FROM market_payouts WHERE status IN ('sent','pending')
  `);
  const paidIds = new Set<string>(alreadyPaid.rows.map((r: any) => r.position_id));
  console.log(`Already-recorded payouts (sent or pending): ${paidIds.size}\n`);

  for (const m of markets.rows as any[]) {
    const c = await computePayoutsForMarket(m.id, true);
    if (!c || c.rows.length === 0) continue;
    const unpaid = c.rows.filter(r => !paidIds.has(r.positionId));
    if (unpaid.length === 0) continue;
    console.log(`Market ${m.id} | "${m.question}" | outcome=${m.outcome} | pool=${c.totalPoolSol.toFixed(4)} SOL`);
    for (const r of unpaid) {
      const sol = (Number(r.amountLamports) / LAMPORTS_PER_SOL).toFixed(6);
      console.log(`  ${r.walletAddress} -> ${sol} SOL  (position ${r.positionId})`);
      totalLamports += r.amountLamports;
      positionsCount++;
      perWallet.set(r.walletAddress, (perWallet.get(r.walletAddress) ?? 0n) + r.amountLamports);
    }
    console.log("");
  }
  console.log("==================================================");
  console.log(`UNPAID positions: ${positionsCount}`);
  console.log(`UNPAID wallets  : ${perWallet.size}`);
  console.log(`TOTAL OWED      : ${(Number(totalLamports) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  console.log("==================================================");
  console.log("\nTop 10 wallets by amount owed:");
  const sorted = [...perWallet.entries()].sort((a, b) => Number(b[1] - a[1]));
  for (const [w, lam] of sorted.slice(0, 10)) {
    console.log(`  ${w}  ${(Number(lam) / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
