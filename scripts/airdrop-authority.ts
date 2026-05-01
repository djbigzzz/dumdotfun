// Devnet-only: airdrop SOL to the platform authority so it can pay out
// market winners. Public devnet faucet caps at ~2 SOL per call with rate
// limits, so we loop with backoff. Aborts cleanly if airdrops are throttled.
import { Connection, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";

function parseSecret(raw: string): Uint8Array {
  const t = raw.trim();
  if (t.startsWith("[")) return Uint8Array.from(JSON.parse(t));
  if (t.includes(",")) return new Uint8Array(t.split(",").map(Number));
  return new Uint8Array(Buffer.from(t, "base64"));
}

const TARGET_SOL = Number(process.env.TARGET_SOL || 65);
const PER_REQUEST_SOL = 2;

async function main() {
  const secret = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (!secret) throw new Error("PLATFORM_AUTHORITY_SECRET_KEY missing");
  const kp = Keypair.fromSecretKey(parseSecret(secret));
  // Use public devnet endpoint for airdrops - Helius doesn't support requestAirdrop.
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");

  let bal = await conn.getBalance(kp.publicKey, "confirmed");
  console.log(`Authority ${kp.publicKey.toBase58()} starting balance: ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  console.log(`Target balance: ${TARGET_SOL} SOL\n`);

  let consecutiveFails = 0;
  while (bal / LAMPORTS_PER_SOL < TARGET_SOL && consecutiveFails < 3) {
    try {
      const sig = await conn.requestAirdrop(kp.publicKey, PER_REQUEST_SOL * LAMPORTS_PER_SOL);
      await conn.confirmTransaction(sig, "confirmed");
      bal = await conn.getBalance(kp.publicKey, "confirmed");
      console.log(`+${PER_REQUEST_SOL} SOL airdropped, balance now ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL  (sig ${sig.slice(0, 16)}...)`);
      consecutiveFails = 0;
      await new Promise(r => setTimeout(r, 1500));
    } catch (err: any) {
      consecutiveFails++;
      console.error(`Airdrop failed (${consecutiveFails}/3): ${err.message}`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
  bal = await conn.getBalance(kp.publicKey, "confirmed");
  console.log(`\nFinal balance: ${(bal / LAMPORTS_PER_SOL).toFixed(4)} SOL`);
  if (bal / LAMPORTS_PER_SOL < TARGET_SOL) {
    console.warn(`Did not reach target. Manual top-up may be required.`);
    process.exit(2);
  }
  process.exit(0);
}
main().catch(e => { console.error(e); process.exit(1); });
