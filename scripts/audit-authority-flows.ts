// Read-only: walk the authority wallet's on-chain transaction history,
// classify each transfer as inflow (bet) or outflow, and reconcile against
// what the database thinks happened. Helps explain any deficit between SOL
// owed to winners and SOL actually held.
import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

const AUTH = new PublicKey("G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM");
const conn = new Connection("https://api.devnet.solana.com", "confirmed");

async function main() {
  // 1. DB: total bet volume for resolved markets
  const dbInflows: any = await db.execute(sql`
    SELECT COALESCE(SUM((amount::numeric) / 0.98), 0)::text AS gross_bet_sol,
           COALESCE(SUM(amount::numeric), 0)::text AS net_bet_sol,
           COUNT(*)::int AS n
    FROM positions p
    JOIN prediction_markets m ON m.id = p.market_id
    WHERE m.status = 'resolved'
  `);
  console.log("DB (resolved markets only):");
  console.log(`  positions: ${dbInflows.rows[0].n}`);
  console.log(`  net pool : ${dbInflows.rows[0].net_bet_sol} SOL`);
  console.log(`  gross bet: ${dbInflows.rows[0].gross_bet_sol} SOL (incl 2% fee, what should have hit authority)`);

  const dbAll: any = await db.execute(sql`
    SELECT COALESCE(SUM((amount::numeric) / 0.98), 0)::text AS gross_bet_sol,
           COUNT(*)::int AS n
    FROM positions
  `);
  console.log(`DB (all positions): ${dbAll.rows[0].n} positions, total gross ${dbAll.rows[0].gross_bet_sol} SOL`);

  // 2. On-chain: walk authority sigs, sum inflows vs outflows
  const balLamports = await conn.getBalance(AUTH, "confirmed");
  console.log(`\nOn-chain balance: ${(balLamports / LAMPORTS_PER_SOL).toFixed(4)} SOL`);

  console.log("Walking signatures (this may take a minute)...");
  let before: string | undefined = undefined;
  let totalIn = 0, totalOut = 0, fees = 0, count = 0;
  const outflowSamples: Array<{ sig: string; sol: number; to: string }> = [];
  while (true) {
    const sigs = await conn.getSignaturesForAddress(AUTH, { limit: 1000, before });
    if (sigs.length === 0) break;
    for (let i = 0; i < sigs.length; i += 100) {
      const batch = sigs.slice(i, i + 100);
      const txs = await conn.getTransactions(batch.map(s => s.signature), {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      for (let j = 0; j < txs.length; j++) {
        const tx = txs[j];
        if (!tx || tx.meta?.err) continue;
        count++;
        const keys = ('getAccountKeys' in tx.transaction.message)
          ? tx.transaction.message.getAccountKeys().staticAccountKeys
          : (tx.transaction.message as any).accountKeys;
        const idx = keys.findIndex((k: PublicKey) => k.equals(AUTH));
        if (idx < 0) continue;
        const pre = tx.meta!.preBalances[idx];
        const post = tx.meta!.postBalances[idx];
        const delta = post - pre;
        if (delta > 0) totalIn += delta;
        else if (delta < 0) {
          const amt = -delta;
          totalOut += amt;
          if (idx === 0) fees += tx.meta!.fee || 0;
          if (outflowSamples.length < 15 && amt > 0.05 * LAMPORTS_PER_SOL) {
            // Find recipient
            let to = "?";
            const otherIdx = tx.meta!.postBalances.findIndex((b, k) => k !== idx && b - tx.meta!.preBalances[k] > amt * 0.5);
            if (otherIdx >= 0) to = keys[otherIdx].toBase58();
            outflowSamples.push({ sig: batch[j].signature, sol: amt / LAMPORTS_PER_SOL, to });
          }
        }
      }
    }
    if (sigs.length < 1000) break;
    before = sigs[sigs.length - 1].signature;
    process.stdout.write(`...${count} txs scanned\r`);
  }
  console.log(`\nProcessed ${count} successful transactions`);
  console.log(`  Total IN : ${(totalIn / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`  Total OUT: ${(totalOut / LAMPORTS_PER_SOL).toFixed(4)} SOL  (incl ${(fees / LAMPORTS_PER_SOL).toFixed(4)} SOL fees)`);
  console.log(`  Net      : ${((totalIn - totalOut) / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log("\nLargest outflows (sample):");
  outflowSamples.sort((a, b) => b.sol - a.sol);
  for (const o of outflowSamples.slice(0, 15)) {
    console.log(`  ${o.sol.toFixed(4)} SOL -> ${o.to}  (${o.sig.slice(0, 16)}...)`);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
