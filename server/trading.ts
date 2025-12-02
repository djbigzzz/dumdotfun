import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID, 
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import BN from "bn.js";
import { 
  calculateBuyQuote, 
  calculateSellQuote, 
  BondingCurveState,
  BONDING_CURVE_CONSTANTS 
} from "./bonding-curve";

// Configuration - will be set when contract is deployed
export const TRADING_CONFIG = {
  // Program ID - placeholder until contract is deployed
  BONDING_CURVE_PROGRAM_ID: process.env.BONDING_CURVE_PROGRAM_ID || "11111111111111111111111111111111",
  
  // RPC endpoint
  RPC_ENDPOINT: process.env.SOLANA_RPC_URL || "https://api.mainnet-beta.solana.com",
  
  // Fee recipient (platform wallet)
  FEE_RECIPIENT: process.env.FEE_RECIPIENT_WALLET || "",
  
  // Slippage tolerance (in basis points)
  DEFAULT_SLIPPAGE_BPS: 500, // 5%
};

// Create Solana connection
export function getConnection(): Connection {
  return new Connection(TRADING_CONFIG.RPC_ENDPOINT, "confirmed");
}

// Derive bonding curve PDA for a token mint
export function deriveBondingCurvePDA(tokenMint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding-curve"), tokenMint.toBytes()],
    programId
  );
}

// Derive associated bonding curve account
export function deriveAssociatedBondingCurve(bondingCurve: PublicKey, tokenMint: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [bondingCurve.toBytes(), TOKEN_PROGRAM_ID.toBytes(), tokenMint.toBytes()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];
}

export interface TradeParams {
  userWallet: string;
  tokenMint: string;
  amount: string; // In lamports for buy, token smallest unit for sell
  slippageBps?: number;
  isBuy: boolean;
}

export interface TradeResult {
  success: boolean;
  transaction?: string; // Base64 encoded transaction
  quote?: {
    inputAmount: string;
    outputAmount: string;
    priceImpact: number;
    fee: string;
  };
  error?: string;
}

/**
 * Get quote for a trade without executing
 */
export async function getTradeQuote(params: TradeParams): Promise<TradeResult> {
  try {
    const connection = getConnection();
    const tokenMint = new PublicKey(params.tokenMint);
    const amount = new BN(params.amount);
    
    // For now, use mock curve state until we fetch from on-chain
    // In production, this would fetch the actual bonding curve account data
    const curveState = await fetchBondingCurveState(connection, tokenMint);
    
    if (!curveState) {
      return {
        success: false,
        error: "Token not found or bonding curve not initialized",
      };
    }
    
    const quote = params.isBuy 
      ? calculateBuyQuote(amount, curveState)
      : calculateSellQuote(amount, curveState);
    
    return {
      success: true,
      quote: {
        inputAmount: quote.inputAmount.toString(),
        outputAmount: quote.outputAmount.toString(),
        priceImpact: quote.priceImpact,
        fee: quote.fee.toString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || "Failed to get quote",
    };
  }
}

/**
 * Build a buy transaction
 */
export async function buildBuyTransaction(params: TradeParams): Promise<TradeResult> {
  try {
    if (TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID === "11111111111111111111111111111111") {
      return {
        success: false,
        error: "Trading not yet available - bonding curve contract not deployed",
      };
    }
    
    const connection = getConnection();
    const userWallet = new PublicKey(params.userWallet);
    const tokenMint = new PublicKey(params.tokenMint);
    const solAmount = new BN(params.amount);
    const slippageBps = params.slippageBps || TRADING_CONFIG.DEFAULT_SLIPPAGE_BPS;
    
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    
    // Derive PDAs
    const [bondingCurve] = deriveBondingCurvePDA(tokenMint, programId);
    const associatedBondingCurve = deriveAssociatedBondingCurve(bondingCurve, tokenMint);
    
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet);
    
    // Get curve state and calculate quote
    const curveState = await fetchBondingCurveState(connection, tokenMint);
    if (!curveState) {
      return {
        success: false,
        error: "Bonding curve not found",
      };
    }
    
    const quote = calculateBuyQuote(solAmount, curveState);
    
    // Calculate minimum tokens out with slippage
    const minTokensOut = quote.outputAmount.mul(new BN(10000 - slippageBps)).div(new BN(10000));
    
    // Build transaction
    const transaction = new Transaction();
    
    // Check if user token account exists, if not create it
    const userTokenAccountInfo = await connection.getAccountInfo(userTokenAccount);
    if (!userTokenAccountInfo) {
      transaction.add(
        createAssociatedTokenAccountInstruction(
          userWallet,
          userTokenAccount,
          userWallet,
          tokenMint
        )
      );
    }
    
    // Add buy instruction (placeholder - actual instruction depends on deployed contract)
    // This would be replaced with the actual buy instruction from the deployed contract
    const buyInstruction = createBuyInstruction({
      programId,
      bondingCurve,
      associatedBondingCurve,
      tokenMint,
      userWallet,
      userTokenAccount,
      solAmount,
      minTokensOut,
    });
    
    transaction.add(buyInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // Serialize transaction
    const serialized = transaction.serialize({ requireAllSignatures: false });
    
    return {
      success: true,
      transaction: serialized.toString("base64"),
      quote: {
        inputAmount: quote.inputAmount.toString(),
        outputAmount: quote.outputAmount.toString(),
        priceImpact: quote.priceImpact,
        fee: quote.fee.toString(),
      },
    };
  } catch (error: any) {
    console.error("Error building buy transaction:", error);
    return {
      success: false,
      error: error.message || "Failed to build transaction",
    };
  }
}

/**
 * Build a sell transaction
 */
export async function buildSellTransaction(params: TradeParams): Promise<TradeResult> {
  try {
    if (TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID === "11111111111111111111111111111111") {
      return {
        success: false,
        error: "Trading not yet available - bonding curve contract not deployed",
      };
    }
    
    const connection = getConnection();
    const userWallet = new PublicKey(params.userWallet);
    const tokenMint = new PublicKey(params.tokenMint);
    const tokenAmount = new BN(params.amount);
    const slippageBps = params.slippageBps || TRADING_CONFIG.DEFAULT_SLIPPAGE_BPS;
    
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    
    // Derive PDAs
    const [bondingCurve] = deriveBondingCurvePDA(tokenMint, programId);
    const associatedBondingCurve = deriveAssociatedBondingCurve(bondingCurve, tokenMint);
    
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet);
    
    // Get curve state and calculate quote
    const curveState = await fetchBondingCurveState(connection, tokenMint);
    if (!curveState) {
      return {
        success: false,
        error: "Bonding curve not found",
      };
    }
    
    const quote = calculateSellQuote(tokenAmount, curveState);
    
    // Calculate minimum SOL out with slippage
    const minSolOut = quote.outputAmount.mul(new BN(10000 - slippageBps)).div(new BN(10000));
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add sell instruction (placeholder - actual instruction depends on deployed contract)
    const sellInstruction = createSellInstruction({
      programId,
      bondingCurve,
      associatedBondingCurve,
      tokenMint,
      userWallet,
      userTokenAccount,
      tokenAmount,
      minSolOut,
    });
    
    transaction.add(sellInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = userWallet;
    
    // Serialize transaction
    const serialized = transaction.serialize({ requireAllSignatures: false });
    
    return {
      success: true,
      transaction: serialized.toString("base64"),
      quote: {
        inputAmount: quote.inputAmount.toString(),
        outputAmount: quote.outputAmount.toString(),
        priceImpact: quote.priceImpact,
        fee: quote.fee.toString(),
      },
    };
  } catch (error: any) {
    console.error("Error building sell transaction:", error);
    return {
      success: false,
      error: error.message || "Failed to build transaction",
    };
  }
}

/**
 * Fetch bonding curve state from on-chain (placeholder implementation)
 */
async function fetchBondingCurveState(
  connection: Connection,
  tokenMint: PublicKey
): Promise<BondingCurveState | null> {
  // In production, this would fetch the actual bonding curve account
  // and deserialize the data using the contract's IDL
  
  // For now, return a mock state for development
  // This simulates a token that's 30% through its bonding curve
  return {
    virtualTokenReserves: new BN("751100000000000"), // ~70% remaining
    virtualSolReserves: new BN("55000000000"), // ~55 SOL accumulated
    realTokenReserves: new BN("555170000000000"), // Real tokens available
    realSolReserves: new BN("25000000000"), // ~25 SOL in curve
    tokenTotalSupply: new BN("1000000000000000"), // 1B tokens
    complete: false,
  };
}

/**
 * Create buy instruction (placeholder - needs actual contract IDL)
 */
function createBuyInstruction(params: {
  programId: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  tokenMint: PublicKey;
  userWallet: PublicKey;
  userTokenAccount: PublicKey;
  solAmount: BN;
  minTokensOut: BN;
}): TransactionInstruction {
  // This is a placeholder instruction
  // In production, this would be built using the contract's IDL
  
  // Instruction discriminator for "buy" (first 8 bytes of sha256("global:buy"))
  const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
  
  // Encode parameters
  const data = Buffer.concat([
    discriminator,
    params.solAmount.toArrayLike(Buffer, "le", 8),
    params.minTokensOut.toArrayLike(Buffer, "le", 8),
  ]);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: params.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.tokenMint, isSigner: false, isWritable: false },
      { pubkey: params.userWallet, isSigner: true, isWritable: true },
      { pubkey: params.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: params.programId,
    data,
  });
}

/**
 * Create sell instruction (placeholder - needs actual contract IDL)
 */
function createSellInstruction(params: {
  programId: PublicKey;
  bondingCurve: PublicKey;
  associatedBondingCurve: PublicKey;
  tokenMint: PublicKey;
  userWallet: PublicKey;
  userTokenAccount: PublicKey;
  tokenAmount: BN;
  minSolOut: BN;
}): TransactionInstruction {
  // This is a placeholder instruction
  // In production, this would be built using the contract's IDL
  
  // Instruction discriminator for "sell" (first 8 bytes of sha256("global:sell"))
  const discriminator = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
  
  // Encode parameters
  const data = Buffer.concat([
    discriminator,
    params.tokenAmount.toArrayLike(Buffer, "le", 8),
    params.minSolOut.toArrayLike(Buffer, "le", 8),
  ]);
  
  return new TransactionInstruction({
    keys: [
      { pubkey: params.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.tokenMint, isSigner: false, isWritable: false },
      { pubkey: params.userWallet, isSigner: true, isWritable: true },
      { pubkey: params.userTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: params.programId,
    data,
  });
}
