import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import bs58 from "bs58";

function parseSecret(raw: string): Uint8Array {
  const t = raw.trim();
  if (t.startsWith("[")) return Uint8Array.from(JSON.parse(t));
  if (t.includes(",")) return new Uint8Array(t.split(",").map(Number));
  return new Uint8Array(Buffer.from(t, "base64"));
}

const secret = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
const feeRecipient = process.env.FEE_RECIPIENT_WALLET;
const rpc = process.env.HELIUS_RPC_URL || "https://api.devnet.solana.com";

(async () => {
  if (!secret) { console.log("PLATFORM_AUTHORITY_SECRET_KEY missing"); process.exit(1); }
  const kp = Keypair.fromSecretKey(parseSecret(secret));
  console.log("Authority pubkey :", kp.publicKey.toBase58());
  console.log("Fee recipient    :", feeRecipient ?? "(missing)");
  console.log("Match            :", kp.publicKey.toBase58() === feeRecipient ? "YES" : "NO");
  const conn = new Connection(rpc, "confirmed");
  const bal = await conn.getBalance(kp.publicKey, "confirmed");
  console.log(`Authority balance: ${(bal / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  if (feeRecipient && feeRecipient !== kp.publicKey.toBase58()) {
    const bal2 = await conn.getBalance(new PublicKey(feeRecipient), "confirmed");
    console.log(`Fee recipient balance: ${(bal2 / LAMPORTS_PER_SOL).toFixed(6)} SOL`);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
