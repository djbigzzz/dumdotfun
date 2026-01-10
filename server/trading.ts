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
  
  // RPC endpoint - Use centralized Helius RPC helper
  get RPC_ENDPOINT() {
    const { getHeliusRpcUrl } = require("./helius-rpc");
    return getHeliusRpcUrl();
  },
  
  // Fee recipient (platform wallet)
  FEE_RECIPIENT: process.env.FEE_RECIPIENT_WALLET || "",
  
  // Slippage tolerance (in basis points)
  DEFAULT_SLIPPAGE_BPS: 500, // 5%
};

import { getConnection as getHeliusConnection, createNewConnection } from "./helius-rpc";

// Create Solana connection - uses centralized Helius RPC helper
export function getConnection(): Connection {
  return getHeliusConnection();
}

// Derive bonding curve PDA for a token mint
// Seeds: ["bonding_curve", mint] - matches our Rust contract
export function deriveBondingCurvePDA(tokenMint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), tokenMint.toBytes()],
    programId
  );
}

// Derive SOL vault PDA for a token mint
// Seeds: ["curve_vault", mint] - matches our Rust contract
export function deriveCurveVaultPDA(tokenMint: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("curve_vault"), tokenMint.toBytes()],
    programId
  );
}

// Derive platform config PDA
export function derivePlatformConfigPDA(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    programId
  );
}

// Get fee recipient wallet from environment or platform config
export function getFeeRecipientWallet(): PublicKey {
  const feeRecipient = process.env.FEE_RECIPIENT_WALLET;
  if (!feeRecipient) {
    throw new Error("FEE_RECIPIENT_WALLET environment variable not set");
  }
  return new PublicKey(feeRecipient);
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
 * Check if trading is enabled (contract deployed)
 */
export function isTradingEnabled(): boolean {
  return TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID !== "11111111111111111111111111111111";
}

/**
 * Get quote for a trade without executing
 * Returns error if bonding curve contract is not deployed
 */
export async function getTradeQuote(params: TradeParams): Promise<TradeResult> {
  // Trading not available until contract is deployed
  if (!isTradingEnabled()) {
    return {
      success: false,
      error: "Trading not yet available - bonding curve contract not deployed. Deploy your own contract and set BONDING_CURVE_PROGRAM_ID.",
    };
  }

  try {
    const connection = getConnection();
    const tokenMint = new PublicKey(params.tokenMint);
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    const amount = new BN(params.amount);
    
    // Fetch real on-chain curve state
    const curveState = await fetchBondingCurveState(connection, tokenMint, programId);
    
    if (!curveState) {
      return {
        success: false,
        error: "Token not found or bonding curve not initialized on-chain",
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
      error: error.message || "Failed to get quote from on-chain data",
    };
  }
}

/**
 * Build a buy transaction
 * Requires bonding curve contract to be deployed
 */
export async function buildBuyTransaction(params: TradeParams): Promise<TradeResult> {
  if (!isTradingEnabled()) {
    return {
      success: false,
      error: "Trading not yet available - bonding curve contract not deployed. Deploy your own contract and set BONDING_CURVE_PROGRAM_ID.",
    };
  }

  try {
    
    const connection = getConnection();
    const userWallet = new PublicKey(params.userWallet);
    const tokenMint = new PublicKey(params.tokenMint);
    const solAmount = new BN(params.amount);
    const slippageBps = params.slippageBps || TRADING_CONFIG.DEFAULT_SLIPPAGE_BPS;
    
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    
    // Derive PDAs matching our Rust contract
    const [bondingCurve, bondingCurveBump] = deriveBondingCurvePDA(tokenMint, programId);
    const [curveVault, curveVaultBump] = deriveCurveVaultPDA(tokenMint, programId);
    const [platformConfig] = derivePlatformConfigPDA(programId);
    const feeRecipient = getFeeRecipientWallet();
    
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet);
    
    // Get curve state and calculate quote from real on-chain data
    const curveState = await fetchBondingCurveState(connection, tokenMint, programId);
    if (!curveState) {
      return {
        success: false,
        error: "Bonding curve not found on-chain for this token",
      };
    }

    if (curveState.complete) {
      return {
        success: false,
        error: "This token has graduated - trade on Raydium DEX instead",
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
    
    // Add buy instruction
    const buyInstruction = createBuyInstruction({
      programId,
      buyer: userWallet,
      mint: tokenMint,
      bondingCurve,
      curveVault,
      platformConfig,
      feeRecipient,
      buyerTokenAccount: userTokenAccount,
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
 * Requires bonding curve contract to be deployed
 */
export async function buildSellTransaction(params: TradeParams): Promise<TradeResult> {
  if (!isTradingEnabled()) {
    return {
      success: false,
      error: "Trading not yet available - bonding curve contract not deployed. Deploy your own contract and set BONDING_CURVE_PROGRAM_ID.",
    };
  }

  try {
    
    const connection = getConnection();
    const userWallet = new PublicKey(params.userWallet);
    const tokenMint = new PublicKey(params.tokenMint);
    const tokenAmount = new BN(params.amount);
    const slippageBps = params.slippageBps || TRADING_CONFIG.DEFAULT_SLIPPAGE_BPS;
    
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    
    // Derive PDAs matching our Rust contract
    const [bondingCurve] = deriveBondingCurvePDA(tokenMint, programId);
    const [curveVault] = deriveCurveVaultPDA(tokenMint, programId);
    const [platformConfig] = derivePlatformConfigPDA(programId);
    const feeRecipient = getFeeRecipientWallet();
    
    // Get user's token account
    const userTokenAccount = await getAssociatedTokenAddress(tokenMint, userWallet);
    
    // Get curve state and calculate quote from real on-chain data
    const curveState = await fetchBondingCurveState(connection, tokenMint, programId);
    if (!curveState) {
      return {
        success: false,
        error: "Bonding curve not found on-chain for this token",
      };
    }

    if (curveState.complete) {
      return {
        success: false,
        error: "This token has graduated - trade on Raydium DEX instead",
      };
    }
    
    const quote = calculateSellQuote(tokenAmount, curveState);
    
    // Calculate minimum SOL out with slippage
    const minSolOut = quote.outputAmount.mul(new BN(10000 - slippageBps)).div(new BN(10000));
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add sell instruction
    const sellInstruction = createSellInstruction({
      programId,
      seller: userWallet,
      mint: tokenMint,
      bondingCurve,
      curveVault,
      platformConfig,
      feeRecipient,
      sellerTokenAccount: userTokenAccount,
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
 * Bonding curve account data layout
 * Must match the deployed contract's BondingCurve struct
 * 
 * pub struct BondingCurve {
 *   pub mint: Pubkey,                  // 32 bytes
 *   pub creator: Pubkey,               // 32 bytes
 *   pub virtual_sol_reserves: u64,     // 8 bytes
 *   pub virtual_token_reserves: u64,   // 8 bytes
 *   pub real_sol_reserves: u64,        // 8 bytes
 *   pub real_token_reserves: u64,      // 8 bytes
 *   pub total_supply: u64,             // 8 bytes
 *   pub is_graduated: bool,            // 1 byte
 *   pub created_at: i64,               // 8 bytes
 *   pub name: String,                  // 4 + max 32 bytes
 *   pub symbol: String,                // 4 + max 10 bytes
 *   pub uri: String,                   // 4 + max 200 bytes
 *   pub bump: u8,                      // 1 byte
 *   pub vault_bump: u8,                // 1 byte
 * }
 */

/**
 * Fetch bonding curve state from on-chain
 * Returns null if account doesn't exist or can't be parsed
 */
async function fetchBondingCurveState(
  connection: Connection,
  tokenMint: PublicKey,
  programId: PublicKey
): Promise<BondingCurveState | null> {
  try {
    // Derive the bonding curve PDA for this token
    const [bondingCurvePda] = deriveBondingCurvePDA(tokenMint, programId);
    
    // Fetch the account data
    const accountInfo = await connection.getAccountInfo(bondingCurvePda);
    
    if (!accountInfo || !accountInfo.data) {
      console.log(`No bonding curve found for mint ${tokenMint.toString()}`);
      return null;
    }

    // Parse the account data
    // Account layout (matching our Anchor contract):
    // - 8 bytes: discriminator
    // - 32 bytes: mint (Pubkey)
    // - 32 bytes: creator (Pubkey)
    // - 8 bytes: virtual_sol_reserves (u64)
    // - 8 bytes: virtual_token_reserves (u64)
    // - 8 bytes: real_sol_reserves (u64)
    // - 8 bytes: real_token_reserves (u64)
    // - 8 bytes: total_supply (u64)
    // - 1 byte: is_graduated (bool)
    // ... (name, symbol, uri, bumps follow)
    
    const data = accountInfo.data;
    
    // Minimum size check: 8 + 32 + 32 + 8*5 + 1 = 113 bytes
    if (data.length < 113) {
      console.error("Bonding curve account data too short");
      return null;
    }

    let offset = 8; // Skip 8-byte discriminator
    
    // Skip mint and creator pubkeys (32 + 32 = 64 bytes)
    offset += 64;
    
    // Read reserves - note the order in our contract
    const virtualSolReserves = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    
    const virtualTokenReserves = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    
    const realSolReserves = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    
    const realTokenReserves = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    
    const tokenTotalSupply = new BN(data.slice(offset, offset + 8), "le");
    offset += 8;
    
    const complete = data[offset] === 1;

    return {
      virtualTokenReserves,
      virtualSolReserves,
      realTokenReserves,
      realSolReserves,
      tokenTotalSupply,
      complete,
    };
  } catch (error) {
    console.error("Error fetching bonding curve state:", error);
    return null;
  }
}

/**
 * Create buy instruction matching our Anchor contract
 * 
 * pub fn buy(ctx: Context<Buy>, sol_amount: u64, min_tokens_out: u64) -> Result<()>
 */
function createBuyInstruction(params: {
  programId: PublicKey;
  buyer: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  curveVault: PublicKey;
  platformConfig: PublicKey;
  feeRecipient: PublicKey;
  buyerTokenAccount: PublicKey;
  solAmount: BN;
  minTokensOut: BN;
}): TransactionInstruction {
  // Anchor instruction discriminator for "buy"
  // First 8 bytes of sha256("global:buy")
  const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);
  
  // Encode parameters: sol_amount (u64) + min_tokens_out (u64)
  const data = Buffer.concat([
    discriminator,
    params.solAmount.toArrayLike(Buffer, "le", 8),
    params.minTokensOut.toArrayLike(Buffer, "le", 8),
  ]);
  
  // Account order must match Buy struct in contract:
  // 1. buyer (signer, mut)
  // 2. mint (mut)
  // 3. bonding_curve (mut)
  // 4. curve_sol_vault (mut)
  // 5. platform_config (mut)
  // 6. fee_recipient (mut) - YOUR WALLET receives fees directly!
  // 7. buyer_token_account (mut)
  // 8. system_program
  // 9. token_program
  // 10. associated_token_program
  return new TransactionInstruction({
    keys: [
      { pubkey: params.buyer, isSigner: true, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: true },
      { pubkey: params.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.curveVault, isSigner: false, isWritable: true },
      { pubkey: params.platformConfig, isSigner: false, isWritable: true },
      { pubkey: params.feeRecipient, isSigner: false, isWritable: true },
      { pubkey: params.buyerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: params.programId,
    data,
  });
}

/**
 * Create sell instruction matching our Anchor contract
 * 
 * pub fn sell(ctx: Context<Sell>, token_amount: u64, min_sol_out: u64) -> Result<()>
 */
function createSellInstruction(params: {
  programId: PublicKey;
  seller: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  curveVault: PublicKey;
  platformConfig: PublicKey;
  feeRecipient: PublicKey;
  sellerTokenAccount: PublicKey;
  tokenAmount: BN;
  minSolOut: BN;
}): TransactionInstruction {
  // Anchor instruction discriminator for "sell"
  // First 8 bytes of sha256("global:sell")
  const discriminator = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);
  
  // Encode parameters: token_amount (u64) + min_sol_out (u64)
  const data = Buffer.concat([
    discriminator,
    params.tokenAmount.toArrayLike(Buffer, "le", 8),
    params.minSolOut.toArrayLike(Buffer, "le", 8),
  ]);
  
  // Account order must match Sell struct in contract:
  // 1. seller (signer, mut)
  // 2. mint (mut)
  // 3. bonding_curve (mut)
  // 4. curve_sol_vault (mut)
  // 5. platform_config (mut)
  // 6. fee_recipient (mut) - YOUR WALLET receives fees directly!
  // 7. seller_token_account (mut)
  // 8. system_program
  // 9. token_program
  return new TransactionInstruction({
    keys: [
      { pubkey: params.seller, isSigner: true, isWritable: true },
      { pubkey: params.mint, isSigner: false, isWritable: true },
      { pubkey: params.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.curveVault, isSigner: false, isWritable: true },
      { pubkey: params.platformConfig, isSigner: false, isWritable: true },
      { pubkey: params.feeRecipient, isSigner: false, isWritable: true },
      { pubkey: params.sellerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    programId: params.programId,
    data,
  });
}

/**
 * Build create token transaction for custom bonding curve
 */
export async function buildCreateTokenTransaction(params: {
  creator: string;
  mint: string;
  name: string;
  symbol: string;
  uri: string;
}): Promise<TradeResult> {
  if (!isTradingEnabled()) {
    return {
      success: false,
      error: "Custom bonding curve contract not deployed. Set BONDING_CURVE_PROGRAM_ID environment variable.",
    };
  }

  try {
    const connection = getConnection();
    const creator = new PublicKey(params.creator);
    const mint = new PublicKey(params.mint);
    const programId = new PublicKey(TRADING_CONFIG.BONDING_CURVE_PROGRAM_ID);
    
    // Derive PDAs
    const [bondingCurve] = deriveBondingCurvePDA(mint, programId);
    const [curveVault] = deriveCurveVaultPDA(mint, programId);
    
    // Build transaction
    const transaction = new Transaction();
    
    // Add create token instruction
    const createInstruction = createTokenInstruction({
      programId,
      creator,
      mint,
      bondingCurve,
      curveVault,
      name: params.name,
      symbol: params.symbol,
      uri: params.uri,
    });
    
    transaction.add(createInstruction);
    
    // Get recent blockhash
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;
    
    // Serialize transaction
    const serialized = transaction.serialize({ requireAllSignatures: false });
    
    return {
      success: true,
      transaction: serialized.toString("base64"),
    };
  } catch (error: any) {
    console.error("Error building create token transaction:", error);
    return {
      success: false,
      error: error.message || "Failed to build create token transaction",
    };
  }
}

/**
 * Create token instruction matching our Anchor contract
 * 
 * pub fn create_token(ctx: Context<CreateToken>, name: String, symbol: String, uri: String) -> Result<()>
 */
function createTokenInstruction(params: {
  programId: PublicKey;
  creator: PublicKey;
  mint: PublicKey;
  bondingCurve: PublicKey;
  curveVault: PublicKey;
  name: string;
  symbol: string;
  uri: string;
}): TransactionInstruction {
  // Anchor instruction discriminator for "create_token"
  // First 8 bytes of sha256("global:create_token")
  const discriminator = Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]);
  
  // Encode string parameters with Borsh format (4-byte length prefix + utf8 bytes)
  const nameBytes = Buffer.from(params.name, "utf8");
  const symbolBytes = Buffer.from(params.symbol, "utf8");
  const uriBytes = Buffer.from(params.uri, "utf8");
  
  const nameLenBuf = Buffer.alloc(4);
  nameLenBuf.writeUInt32LE(nameBytes.length, 0);
  
  const symbolLenBuf = Buffer.alloc(4);
  symbolLenBuf.writeUInt32LE(symbolBytes.length, 0);
  
  const uriLenBuf = Buffer.alloc(4);
  uriLenBuf.writeUInt32LE(uriBytes.length, 0);
  
  const data = Buffer.concat([
    discriminator,
    nameLenBuf,
    nameBytes,
    symbolLenBuf,
    symbolBytes,
    uriLenBuf,
    uriBytes,
  ]);
  
  // Account order must match CreateToken struct in contract:
  // 1. creator (signer, mut)
  // 2. mint (init, mut)
  // 3. bonding_curve (init, mut)
  // 4. curve_sol_vault (init, mut)
  // 5. system_program
  // 6. token_program
  // 7. rent
  return new TransactionInstruction({
    keys: [
      { pubkey: params.creator, isSigner: true, isWritable: true },
      { pubkey: params.mint, isSigner: true, isWritable: true },
      { pubkey: params.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: params.curveVault, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: new PublicKey("SysvarRent111111111111111111111111111111111"), isSigner: false, isWritable: false },
    ],
    programId: params.programId,
    data,
  });
}
