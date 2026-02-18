import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram, 
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import bs58 from "bs58";

let poolKeypair: Keypair | null = null;

export function getPoolKeypair(): Keypair {
  if (poolKeypair) return poolKeypair;
  
  const poolSecretKey = process.env.POOL_AUTHORITY_SECRET_KEY;
  
  if (poolSecretKey) {
    try {
      const secretKeyBytes = bs58.decode(poolSecretKey);
      poolKeypair = Keypair.fromSecretKey(secretKeyBytes);
      console.log(`[Pool Authority] Loaded existing pool: ${poolKeypair.publicKey.toBase58()}`);
      return poolKeypair;
    } catch (e) {
      console.error("[Pool Authority] Invalid secret key, generating new one");
    }
  }
  
  poolKeypair = Keypair.generate();
  console.log(`[Pool Authority] Generated new pool keypair: ${poolKeypair.publicKey.toBase58()}`);
  console.warn(`[Pool Authority] WARNING: New keypair generated. Set POOL_AUTHORITY_SECRET_KEY env var to persist it.`);
  
  return poolKeypair;
}

export function getPoolAddress(): string {
  return getPoolKeypair().publicKey.toBase58();
}

export async function getPoolBalance(): Promise<number> {
  const connection = getConnection();
  const balance = await connection.getBalance(getPoolKeypair().publicKey);
  return balance / LAMPORTS_PER_SOL;
}

export async function airdropToPool(amount: number = 1): Promise<string> {
  const connection = getConnection();
  const poolPubkey = getPoolKeypair().publicKey;
  
  console.log(`[Pool Authority] Requesting airdrop of ${amount} SOL to pool...`);
  const signature = await connection.requestAirdrop(
    poolPubkey,
    amount * LAMPORTS_PER_SOL
  );
  
  await connection.confirmTransaction(signature, "confirmed");
  console.log(`[Pool Authority] Airdrop confirmed: ${signature}`);
  
  const newBalance = await getPoolBalance();
  console.log(`[Pool Authority] New pool balance: ${newBalance} SOL`);
  
  return signature;
}

export async function withdrawFromPool(
  destinationAddress: string,
  amountSol: number
): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = getConnection();
    const poolKp = getPoolKeypair();
    const destination = new PublicKey(destinationAddress);
    const lamports = Math.floor(amountSol * LAMPORTS_PER_SOL);
    
    const poolBalance = await connection.getBalance(poolKp.publicKey);
    const minRent = 890880; // Solana rent-exempt minimum for 0-data accounts
    
    if (poolBalance < lamports + minRent) {
      return {
        success: false,
        error: `Insufficient pool funds. Pool has ${poolBalance / LAMPORTS_PER_SOL} SOL, need ${amountSol} SOL + fees`
      };
    }
    
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: poolKp.publicKey,
        toPubkey: destination,
        lamports
      })
    );
    
    console.log(`[Pool Authority] Sending ${amountSol} SOL from pool to ${destinationAddress}...`);
    
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [poolKp],
      { commitment: "confirmed" }
    );
    
    console.log(`[Pool Authority] Withdrawal confirmed: ${signature}`);
    
    return { success: true, signature };
  } catch (error: any) {
    console.error("[Pool Authority] Withdrawal error:", error);
    return { success: false, error: error.message };
  }
}

function getConnection(): Connection {
  // Use centralized RPC helper to avoid duplicating API key handling
  try {
    const { getConnection: getCentralizedConnection } = require("../helius-rpc");
    return getCentralizedConnection();
  } catch {
    return new Connection("https://api.devnet.solana.com", "confirmed");
  }
}

export async function initializePool(): Promise<void> {
  const poolKp = getPoolKeypair();
  const balance = await getPoolBalance();
  
  console.log(`[Pool Authority] Pool address: ${poolKp.publicKey.toBase58()}`);
  console.log(`[Pool Authority] Pool balance: ${balance} SOL`);
  
  if (balance < 0.1) {
    console.log(`[Pool Authority] Pool balance low, requesting airdrop...`);
    try {
      await airdropToPool(2);
    } catch (e: any) {
      console.log(`[Pool Authority] Airdrop failed (may be rate limited): ${e.message}`);
    }
  }
}
