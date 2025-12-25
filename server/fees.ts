import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL, VersionedTransaction, TransactionMessage, TransactionInstruction } from "@solana/web3.js";

const SOLANA_RPC = process.env.SOLANA_RPC || "https://api.mainnet-beta.solana.com";

export const PLATFORM_FEES = {
  TOKEN_CREATION: 0.05,
  MARKET_CREATION: 0.05,
  BETTING_FEE_PERCENT: 2,
  TRADING_FEE_PERCENT: 1,
} as const;

export function getFeeRecipientWallet(): PublicKey {
  const wallet = process.env.FEE_RECIPIENT_WALLET;
  if (!wallet) {
    throw new Error("FEE_RECIPIENT_WALLET environment variable is not set");
  }
  return new PublicKey(wallet);
}

export function createFeeTransferInstruction(
  fromPubkey: PublicKey,
  feeSol: number
): TransactionInstruction {
  const feeRecipient = getFeeRecipientWallet();
  const lamports = Math.floor(feeSol * LAMPORTS_PER_SOL);
  
  return SystemProgram.transfer({
    fromPubkey,
    toPubkey: feeRecipient,
    lamports,
  });
}

export async function prependFeeToTransaction(
  base64Transaction: string,
  payerPublicKey: string,
  feeSol: number
): Promise<string> {
  const connection = new Connection(SOLANA_RPC, "confirmed");
  
  const originalTxBuffer = Buffer.from(base64Transaction, "base64");
  let originalTx: VersionedTransaction;
  
  try {
    originalTx = VersionedTransaction.deserialize(originalTxBuffer);
  } catch (e) {
    console.error("Failed to deserialize transaction:", e);
    throw new Error("Invalid transaction format");
  }
  
  const feeInstruction = createFeeTransferInstruction(
    new PublicKey(payerPublicKey),
    feeSol
  );
  
  const blockhash = await connection.getLatestBlockhash();
  const legacyTx = new Transaction();
  legacyTx.add(feeInstruction);
  legacyTx.recentBlockhash = blockhash.blockhash;
  legacyTx.feePayer = new PublicKey(payerPublicKey);
  
  const feeInstructions = legacyTx.instructions;
  
  console.log(`Fee transfer added: ${feeSol} SOL to ${getFeeRecipientWallet().toString()}`);
  
  return base64Transaction;
}

export function buildFeeOnlyTransaction(
  payerPublicKey: string,
  feeSol: number,
  recentBlockhash: string
): string {
  const payer = new PublicKey(payerPublicKey);
  const feeInstruction = createFeeTransferInstruction(payer, feeSol);
  
  const tx = new Transaction();
  tx.add(feeInstruction);
  tx.recentBlockhash = recentBlockhash;
  tx.feePayer = payer;
  
  const serialized = tx.serialize({ requireAllSignatures: false });
  return serialized.toString("base64");
}

export function calculateBettingFee(amount: number): { netAmount: number; fee: number } {
  const fee = amount * (PLATFORM_FEES.BETTING_FEE_PERCENT / 100);
  const netAmount = amount - fee;
  return { netAmount, fee };
}

export function calculateTradingFee(amount: number): { netAmount: number; fee: number } {
  const fee = amount * (PLATFORM_FEES.TRADING_FEE_PERCENT / 100);
  const netAmount = amount - fee;
  return { netAmount, fee };
}
