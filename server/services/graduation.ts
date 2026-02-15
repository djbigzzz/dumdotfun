import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { Raydium } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { getConnection } from "../helius-rpc";
import { fetchBondingCurveData, getBondingCurvePDA, getCurveVaultPDA } from "../bonding-curve-client";
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

async function initRaydium(connection: Connection): Promise<Raydium> {
  const raydium = await Raydium.load({
    connection,
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

  await db.update(tokens)
    .set({ graduationStatus: "migrating", updatedAt: new Date() })
    .where(eq(tokens.mint, mintAddress));

  try {
    const connection = getConnection();
    const mint = new PublicKey(mintAddress);
    const curveData = eligibility.curveData;

    const realSolLamports = curveData.realSolReserves;
    const realTokenAmount = curveData.realTokenReserves;

    const solAmount = realSolLamports / LAMPORTS_PER_SOL;
    const tokenAmount = realTokenAmount / 1_000_000;

    console.log(`[Graduation] Liquidity to migrate: ${solAmount} SOL + ${tokenAmount} tokens`);

    if (solAmount < 0.1) {
      throw new Error(`Insufficient SOL for pool creation: ${solAmount} SOL`);
    }

    const initialPrice = solAmount / tokenAmount;
    console.log(`[Graduation] Initial price: ${initialPrice} SOL per token`);

    const poolResult = await createRaydiumPool(connection, mintAddress, solAmount, tokenAmount, initialPrice);

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
  mintAddress: string,
  solAmount: number,
  tokenAmount: number,
  initialPrice: number
): Promise<{ poolId: string; txSignature: string }> {
  console.log(`[Graduation] Creating Raydium CPMM pool for ${mintAddress}`);
  console.log(`[Graduation] SOL: ${solAmount}, Tokens: ${tokenAmount}, Price: ${initialPrice}`);

  try {
    const raydium = await initRaydium(connection);

    const baseMint = new PublicKey(mintAddress);
    const quoteMint = WRAPPED_SOL_MINT;

    const { execute, extInfo } = await raydium.cpmm.createPool({
      mint1: baseMint,
      mint2: quoteMint,
      mintAAmount: new BN(Math.floor(tokenAmount * 1_000_000)),
      mintBAmount: new BN(Math.floor(solAmount * LAMPORTS_PER_SOL)),
      startTime: new BN(Math.floor(Date.now() / 1000)),
      ownerInfo: {
        useSOLBalance: true,
      },
      associatedOnly: false,
      txVersion: 0 as any,
    });

    console.log(`[Graduation] Pool info prepared, executing transaction...`);

    const { txIds } = await execute({ sequentially: true });
    const txSignature = txIds[0] || "pending";

    console.log(`[Graduation] Pool created successfully!`);
    console.log(`[Graduation] Pool ID: ${extInfo.address.poolId.toString()}`);
    console.log(`[Graduation] TX Signature: ${txSignature}`);

    return {
      poolId: extInfo.address.poolId.toString(),
      txSignature,
    };
  } catch (error: any) {
    console.error(`[Graduation] Raydium pool creation error:`, error);

    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      throw new Error(`Insufficient funds to create Raydium pool. The bonding curve vault needs to transfer liquidity first. Error: ${error.message}`);
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
      const poolId = new PublicKey(token.raydiumPoolId);
      const poolInfos = await raydium.cpmm.getRpcPoolInfos([poolId.toString()]);
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
    raydiumPoolId: token.raydiumPoolId,
    graduationTx: token.graduationTx,
    graduatedAt: token.graduatedAt,
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
