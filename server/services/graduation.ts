import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { Raydium, DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { getConnection } from "../helius-rpc";
import { fetchBondingCurveData } from "../bonding-curve-client";
import { db } from "../db";
import { tokens } from "@shared/schema";
import { eq } from "drizzle-orm";

const WRAPPED_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export interface GraduationResult {
  success: boolean;
  poolId?: string;
  txSignature?: string;
  error?: string;
  tokenMint?: string;
  solLiquidity?: number;
  tokenLiquidity?: number;
}

export interface GraduationStatus {
  isGraduated: boolean;
  graduationStatus: "pending" | "migrating" | "completed" | "failed";
  raydiumPoolId: string | null;
  graduationTx: string | null;
  graduatedAt: Date | null;
  solInPool: number | null;
  tokenInPool: number | null;
}

function getPoolAuthorityKeypair(): Keypair | null {
  const secretKey = process.env.POOL_AUTHORITY_SECRET_KEY;
  if (!secretKey) {
    console.log("[Graduation] No POOL_AUTHORITY_SECRET_KEY set, cannot sign pool creation transactions");
    return null;
  }
  try {
    const decoded = Buffer.from(secretKey, "base64");
    if (decoded.length === 64) {
      return Keypair.fromSecretKey(decoded);
    }
    const bytes = secretKey.split(",").map(Number);
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(new Uint8Array(bytes));
    }
    return null;
  } catch (error) {
    console.error("[Graduation] Failed to parse POOL_AUTHORITY_SECRET_KEY:", error);
    return null;
  }
}

async function initRaydium(connection: Connection, owner?: Keypair): Promise<Raydium> {
  const raydium = await Raydium.load({
    connection,
    owner,
    cluster: "devnet",
    disableLoadToken: true,
  });
  return raydium;
}

export async function checkGraduationEligibility(mintAddress: string): Promise<{
  eligible: boolean;
  reason: string;
  curveData?: any;
}> {
  try {
    const mint = new PublicKey(mintAddress);
    const curveData = await fetchBondingCurveData(mint);

    if (!curveData) {
      return { eligible: false, reason: "Bonding curve not found on-chain" };
    }

    if (!curveData.isGraduated) {
      const realSolLamports = curveData.realSolReserves;
      const realSolAmount = realSolLamports / LAMPORTS_PER_SOL;
      return {
        eligible: false,
        reason: `Token has not graduated yet. Current SOL reserves: ${realSolAmount.toFixed(2)} SOL (needs 85 SOL)`,
        curveData,
      };
    }

    const [token] = await db.select().from(tokens).where(eq(tokens.mint, mintAddress)).limit(1);
    if (token?.graduationStatus === "completed") {
      return {
        eligible: false,
        reason: "Token has already been migrated to Raydium",
        curveData,
      };
    }

    if (token?.graduationStatus === "migrating") {
      return {
        eligible: false,
        reason: "Token migration is already in progress",
        curveData,
      };
    }

    return { eligible: true, reason: "Token is eligible for graduation", curveData };
  } catch (error: any) {
    return { eligible: false, reason: `Error checking eligibility: ${error.message}` };
  }
}

export async function graduateToken(mintAddress: string): Promise<GraduationResult> {
  console.log(`[Graduation] Starting graduation for token: ${mintAddress}`);

  const eligibility = await checkGraduationEligibility(mintAddress);
  if (!eligibility.eligible) {
    console.log(`[Graduation] Token not eligible: ${eligibility.reason}`);
    return { success: false, error: eligibility.reason, tokenMint: mintAddress };
  }

  const poolAuthority = getPoolAuthorityKeypair();
  if (!poolAuthority) {
    console.log("[Graduation] No pool authority keypair available. Set POOL_AUTHORITY_SECRET_KEY to enable auto-migration.");
    await db.update(tokens)
      .set({ graduationStatus: "failed", updatedAt: new Date() })
      .where(eq(tokens.mint, mintAddress));
    return {
      success: false,
      error: "Pool authority keypair not configured. Set POOL_AUTHORITY_SECRET_KEY environment variable.",
      tokenMint: mintAddress,
    };
  }

  await db.update(tokens)
    .set({ graduationStatus: "migrating", updatedAt: new Date() })
    .where(eq(tokens.mint, mintAddress));

  try {
    const connection = getConnection();
    const curveData = eligibility.curveData;

    const realSolLamports = curveData.realSolReserves;
    const realTokenAmount = curveData.realTokenReserves;

    const solAmount = realSolLamports / LAMPORTS_PER_SOL;
    const tokenAmount = realTokenAmount / 1_000_000;

    console.log(`[Graduation] Liquidity to migrate: ${solAmount} SOL + ${tokenAmount} tokens`);

    if (solAmount < 0.1) {
      throw new Error(`Insufficient SOL for pool creation: ${solAmount} SOL`);
    }

    const authorityBalance = await connection.getBalance(poolAuthority.publicKey);
    const authorityBalanceSol = authorityBalance / LAMPORTS_PER_SOL;
    console.log(`[Graduation] Pool authority balance: ${authorityBalanceSol} SOL`);

    if (authorityBalanceSol < 0.1) {
      throw new Error(`Pool authority has insufficient SOL (${authorityBalanceSol} SOL). Need at least 0.1 SOL for pool creation fees. Fund wallet: ${poolAuthority.publicKey.toBase58()}`);
    }

    const initialPrice = solAmount / tokenAmount;
    console.log(`[Graduation] Initial price: ${initialPrice} SOL per token`);

    const poolResult = await createRaydiumPool(
      connection,
      poolAuthority,
      mintAddress,
      solAmount,
      tokenAmount
    );

    if (!poolResult.poolId || poolResult.poolId === "unknown") {
      throw new Error("Pool creation returned no valid pool ID");
    }

    await db.update(tokens)
      .set({
        graduationStatus: "completed",
        raydiumPoolId: poolResult.poolId,
        graduationTx: poolResult.txSignature,
        graduatedAt: new Date(),
        isGraduated: true,
        updatedAt: new Date(),
      })
      .where(eq(tokens.mint, mintAddress));

    console.log(`[Graduation] Successfully graduated token ${mintAddress}`);
    console.log(`[Graduation] Pool ID: ${poolResult.poolId}`);
    console.log(`[Graduation] TX: ${poolResult.txSignature}`);

    return {
      success: true,
      poolId: poolResult.poolId,
      txSignature: poolResult.txSignature,
      tokenMint: mintAddress,
      solLiquidity: solAmount,
      tokenLiquidity: tokenAmount,
    };
  } catch (error: any) {
    console.error(`[Graduation] Failed to graduate token ${mintAddress}:`, error);

    await db.update(tokens)
      .set({ graduationStatus: "failed", updatedAt: new Date() })
      .where(eq(tokens.mint, mintAddress));

    return {
      success: false,
      error: error.message || "Failed to create Raydium pool",
      tokenMint: mintAddress,
    };
  }
}

async function createRaydiumPool(
  connection: Connection,
  owner: Keypair,
  mintAddress: string,
  solAmount: number,
  tokenAmount: number
): Promise<{ poolId: string; txSignature: string }> {
  console.log(`[Graduation] Creating Raydium CPMM pool for ${mintAddress}`);
  console.log(`[Graduation] Owner: ${owner.publicKey.toBase58()}`);
  console.log(`[Graduation] SOL: ${solAmount}, Tokens: ${tokenAmount}`);

  try {
    const raydium = await initRaydium(connection, owner);

    const mintA = {
      address: mintAddress,
      decimals: 6,
      programId: TOKEN_PROGRAM_ID.toString(),
    };

    const mintB = {
      address: WRAPPED_SOL_MINT.toString(),
      decimals: 9,
      programId: TOKEN_PROGRAM_ID.toString(),
    };

    const mintAAmount = new BN(Math.floor(tokenAmount * 1_000_000));
    const mintBAmount = new BN(Math.floor(solAmount * LAMPORTS_PER_SOL));

    let feeConfigs: any[];
    try {
      feeConfigs = await raydium.api.getCpmmConfigs();
      console.log(`[Graduation] Fetched ${feeConfigs.length} fee configs from Raydium API`);
    } catch (apiError) {
      console.log("[Graduation] Raydium API not available for devnet, using default fee config");
      feeConfigs = [{
        id: "devnet_default",
        index: 0,
        protocolFeeRate: 12000,
        tradeFeeRate: 2500,
        fundFeeRate: 0,
        createPoolFee: "0",
        creatorFeeRate: 0,
      }];
    }
    const feeConfig = feeConfigs[0];

    console.log(`[Graduation] Using fee config: ${JSON.stringify(feeConfig)}`);
    console.log(`[Graduation] Preparing CPMM pool transaction...`);

    const createPoolResult = await raydium.cpmm.createPool({
      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA: mintA as any,
      mintB: mintB as any,
      mintAAmount,
      mintBAmount,
      startTime: new BN(0),
      feeConfig: feeConfig as any,
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: true,
      },
      txVersion: 0 as any,
    });

    console.log(`[Graduation] Pool transaction prepared, executing...`);

    const result = await createPoolResult.execute();
    const txSignature = (result as any).txId || "pending";

    const extInfo = (createPoolResult as any).extInfo;
    const poolId = extInfo?.address?.poolId?.toString();

    if (!poolId) {
      throw new Error("Pool creation succeeded but returned no pool ID");
    }

    console.log(`[Graduation] Pool created successfully!`);
    console.log(`[Graduation] Pool ID: ${poolId}`);
    console.log(`[Graduation] TX Signature: ${txSignature}`);

    return { poolId, txSignature };
  } catch (error: any) {
    console.error(`[Graduation] Raydium pool creation error:`, error);

    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      throw new Error(`Insufficient funds to create Raydium pool. The pool authority needs SOL + token balances. Fund wallet: ${owner.publicKey.toBase58()}. Error: ${error.message}`);
    }

    if (error.message?.includes("freeze") || error.message?.includes("authority")) {
      throw new Error(`Token authority issue. Freeze authority may need to be revoked before pool creation. Error: ${error.message}`);
    }

    throw new Error(`Raydium CPMM pool creation failed: ${error.message}`);
  }
}

export async function getGraduationStatus(mintAddress: string): Promise<GraduationStatus> {
  const [token] = await db.select().from(tokens).where(eq(tokens.mint, mintAddress)).limit(1);

  if (!token) {
    return {
      isGraduated: false,
      graduationStatus: "pending",
      raydiumPoolId: null,
      graduationTx: null,
      graduatedAt: null,
      solInPool: null,
      tokenInPool: null,
    };
  }

  let solInPool: number | null = null;
  let tokenInPool: number | null = null;

  if (token.raydiumPoolId) {
    try {
      const connection = getConnection();
      const raydium = await initRaydium(connection);
      const poolInfos = await raydium.cpmm.getRpcPoolInfos([token.raydiumPoolId]);
      const poolInfo = poolInfos[token.raydiumPoolId];

      if (poolInfo) {
        solInPool = (poolInfo as any).mintBAmount?.toNumber?.() / LAMPORTS_PER_SOL || null;
        tokenInPool = (poolInfo as any).mintAAmount?.toNumber?.() / 1_000_000 || null;
      }
    } catch (error) {
      console.log(`[Graduation] Could not fetch pool info for ${mintAddress}`);
    }
  }

  return {
    isGraduated: token.isGraduated,
    graduationStatus: (token.graduationStatus as any) || "pending",
    raydiumPoolId: token.raydiumPoolId || null,
    graduationTx: token.graduationTx || null,
    graduatedAt: token.graduatedAt || null,
    solInPool,
    tokenInPool,
  };
}

export async function retryFailedGraduation(mintAddress: string): Promise<GraduationResult> {
  const [token] = await db.select().from(tokens).where(eq(tokens.mint, mintAddress)).limit(1);

  if (!token) {
    return { success: false, error: "Token not found", tokenMint: mintAddress };
  }

  if (token.graduationStatus !== "failed") {
    return { success: false, error: "Token graduation is not in failed state", tokenMint: mintAddress };
  }

  await db.update(tokens)
    .set({ graduationStatus: "pending", updatedAt: new Date() })
    .where(eq(tokens.mint, mintAddress));

  return graduateToken(mintAddress);
}

export async function checkAndGraduateToken(mintAddress: string): Promise<GraduationResult | null> {
  try {
    const mint = new PublicKey(mintAddress);
    const curveData = await fetchBondingCurveData(mint);

    if (!curveData || !curveData.isGraduated) {
      return null;
    }

    const [token] = await db.select().from(tokens).where(eq(tokens.mint, mintAddress)).limit(1);
    if (token?.graduationStatus === "completed" || token?.graduationStatus === "migrating") {
      return null;
    }

    console.log(`[Graduation] Token ${mintAddress} detected as graduated, initiating auto-migration...`);
    return graduateToken(mintAddress);
  } catch (error: any) {
    console.error(`[Graduation] Auto-check failed for ${mintAddress}:`, error.message);
    return null;
  }
}

export function getRaydiumPoolUrl(poolId: string): string {
  return `https://raydium.io/swap/?inputMint=sol&outputMint=${poolId}`;
}

export function getDevnetRaydiumUrl(poolId: string): string {
  return `https://explorer.solana.com/address/${poolId}?cluster=devnet`;
}
