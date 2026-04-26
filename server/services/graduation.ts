import { Connection, PublicKey, Keypair, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress, getAccount } from "@solana/spl-token";
import { Raydium, DEVNET_PROGRAM_ID } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { getConnection } from "../helius-rpc";
import { fetchBondingCurveData, sendWithdrawLiquidity } from "../bonding-curve-client";
import { db } from "../db";
import { tokens } from "@shared/schema";
import { eq, and, notInArray } from "drizzle-orm";

const WRAPPED_SOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export interface GraduationResult {
  success: boolean;
  poolId?: string;
  txSignature?: string;
  withdrawTx?: string;
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

function getAuthorityKeypair(): Keypair | null {
  const secretKey = process.env.PLATFORM_AUTHORITY_SECRET_KEY;
  if (!secretKey) {
    console.log("[Graduation] No PLATFORM_AUTHORITY_SECRET_KEY set");
    return null;
  }
  try {
    const bytes = secretKey.includes(",")
      ? new Uint8Array(secretKey.split(",").map(Number))
      : new Uint8Array(Buffer.from(secretKey, "base64"));
    if (bytes.length === 64) {
      return Keypair.fromSecretKey(bytes);
    }
    return null;
  } catch (error) {
    console.error("[Graduation] Failed to parse PLATFORM_AUTHORITY_SECRET_KEY:", error);
    return null;
  }
}

function getPoolAuthorityKeypair(): Keypair {
  const secretKey = process.env.POOL_AUTHORITY_SECRET_KEY;
  if (secretKey) {
    try {
      const bytes = secretKey.includes(",")
        ? new Uint8Array(secretKey.split(",").map(Number))
        : new Uint8Array(Buffer.from(secretKey, "base64"));
      if (bytes.length === 64) {
        return Keypair.fromSecretKey(bytes);
      }
    } catch (error) {
      console.error("[Graduation] Failed to parse POOL_AUTHORITY_SECRET_KEY, generating new one:", error);
    }
  }
  const keypair = Keypair.generate();
  console.log(`[Graduation] Generated ephemeral pool authority: ${keypair.publicKey.toBase58()}`);
  console.warn(`[Graduation] No POOL_AUTHORITY_SECRET_KEY set. Generated ephemeral keypair - set the env var to persist.`);
  return keypair;
}

async function initRaydium(connection: Connection, owner?: Keypair): Promise<Raydium> {
  return await Raydium.load({
    connection,
    owner,
    cluster: "devnet",
    disableLoadToken: true,
  });
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
      const realSolAmount = curveData.realSolReserves / LAMPORTS_PER_SOL;
      return {
        eligible: false,
        reason: `Token has not graduated yet. Current SOL reserves: ${realSolAmount.toFixed(2)} SOL (needs 85 SOL)`,
        curveData,
      };
    }

    const [token] = await db.select().from(tokens).where(eq(tokens.mint, mintAddress)).limit(1);
    if (token?.graduationStatus === "completed") {
      return { eligible: false, reason: "Token has already been migrated to Raydium", curveData };
    }
    if (token?.graduationStatus === "migrating") {
      return { eligible: false, reason: "Token migration is already in progress", curveData };
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

  const authorityKeypair = getAuthorityKeypair();
  if (!authorityKeypair) {
    await db.update(tokens)
      .set({ graduationStatus: "failed", updatedAt: new Date() })
      .where(eq(tokens.mint, mintAddress));
    return {
      success: false,
      error: "Platform authority keypair not configured. Set PLATFORM_AUTHORITY_SECRET_KEY.",
      tokenMint: mintAddress,
    };
  }

  const poolAuthority = getPoolAuthorityKeypair();

  // Atomic claim: only the caller that flips status from a non-terminal state
  // to "migrating" proceeds. This prevents two concurrent triggers (background
  // scan + opportunistic GET + post-trade hook) from running migration twice.
  const claimed = await db.update(tokens)
    .set({ graduationStatus: "migrating", updatedAt: new Date() })
    .where(and(
      eq(tokens.mint, mintAddress),
      notInArray(tokens.graduationStatus, ["migrating", "completed"]),
    ))
    .returning({ mint: tokens.mint });

  if (claimed.length === 0) {
    console.log(`[Graduation] Skipping ${mintAddress}: another worker is migrating or it is already completed`);
    return {
      success: false,
      error: "Token migration already in progress or completed",
      tokenMint: mintAddress,
    };
  }

  try {
    const connection = getConnection();
    const curveData = eligibility.curveData;
    const hasLiquidityOnChain = curveData.realSolReserves > 0 || curveData.realTokenReserves > 0;

    let withdrawTx: string | undefined;
    let solAmount = curveData.realSolReserves / LAMPORTS_PER_SOL;
    let tokenAmount = curveData.realTokenReserves / 1_000_000;

    if (hasLiquidityOnChain) {
      console.log(`[Graduation] Step 1: Withdrawing liquidity from bonding curve`);
      console.log(`[Graduation] SOL: ${solAmount}, Tokens: ${tokenAmount}`);
      console.log(`[Graduation] Authority: ${authorityKeypair.publicKey.toBase58()}`);
      console.log(`[Graduation] Destination (pool authority): ${poolAuthority.publicKey.toBase58()}`);

      try {
        const result = await sendWithdrawLiquidity(
          authorityKeypair,
          mintAddress,
          poolAuthority,
        );
        withdrawTx = result.txSignature;
        solAmount = result.solWithdrawn;
        tokenAmount = result.tokensWithdrawn;
        console.log(`[Graduation] Liquidity withdrawn! TX: ${withdrawTx}`);
      } catch (withdrawError: any) {
        console.error(`[Graduation] Withdraw failed:`, withdrawError.message);
        throw new Error(`Failed to withdraw liquidity from bonding curve: ${withdrawError.message}`);
      }
    } else {
      console.log(`[Graduation] Liquidity already withdrawn, checking pool authority balances`);
      const poolBalance = await connection.getBalance(poolAuthority.publicKey);
      solAmount = poolBalance / LAMPORTS_PER_SOL;

      try {
        const mint = new PublicKey(mintAddress);
        const ata = await getAssociatedTokenAddress(mint, poolAuthority.publicKey);
        const tokenAccountInfo = await getAccount(connection, ata);
        tokenAmount = Number(tokenAccountInfo.amount) / 1_000_000;
      } catch {
        tokenAmount = 0;
      }
    }

    if (solAmount < 0.01) {
      throw new Error(`Pool authority has insufficient SOL: ${solAmount}. Wallet: ${poolAuthority.publicKey.toBase58()}`);
    }

    console.log(`[Graduation] Step 2: Creating Raydium CPMM pool`);
    console.log(`[Graduation] Pool authority: ${poolAuthority.publicKey.toBase58()}`);
    console.log(`[Graduation] SOL for pool: ${solAmount}, Tokens for pool: ${tokenAmount}`);

    const poolResult = await createRaydiumPool(
      connection,
      poolAuthority,
      mintAddress,
      solAmount,
      tokenAmount,
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

    console.log(`[Graduation] Token ${mintAddress} graduated successfully!`);
    console.log(`[Graduation] Pool ID: ${poolResult.poolId}`);

    return {
      success: true,
      poolId: poolResult.poolId,
      txSignature: poolResult.txSignature,
      withdrawTx,
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
  tokenAmount: number,
): Promise<{ poolId: string; txSignature: string }> {
  console.log(`[Graduation] Creating Raydium CPMM pool for ${mintAddress}`);

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
      console.log(`[Graduation] Fetched ${feeConfigs.length} fee configs`);
    } catch {
      console.log("[Graduation] Raydium API unavailable for devnet, using defaults");
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

    const createPoolResult = await raydium.cpmm.createPool({
      programId: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_PROGRAM,
      poolFeeAccount: DEVNET_PROGRAM_ID.CREATE_CPMM_POOL_FEE_ACC,
      mintA: mintA as any,
      mintB: mintB as any,
      mintAAmount,
      mintBAmount,
      startTime: new BN(0),
      feeConfig: feeConfigs[0] as any,
      associatedOnly: false,
      ownerInfo: {
        useSOLBalance: true,
      },
      txVersion: 0 as any,
    });

    const result = await createPoolResult.execute();
    const txSignature = (result as any).txId || "pending";

    const extInfo = (createPoolResult as any).extInfo;
    const poolId = extInfo?.address?.poolId?.toString();

    if (!poolId) {
      throw new Error("Pool creation succeeded but returned no pool ID");
    }

    console.log(`[Graduation] Pool created: ${poolId}, TX: ${txSignature}`);
    return { poolId, txSignature };
  } catch (error: any) {
    console.error(`[Graduation] Raydium pool creation error:`, error);

    if (error.message?.includes("insufficient") || error.message?.includes("balance")) {
      throw new Error(`Insufficient funds for pool. Fund wallet: ${owner.publicKey.toBase58()}. Error: ${error.message}`);
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

  return {
    isGraduated: token.isGraduated,
    graduationStatus: (token.graduationStatus as any) || "pending",
    raydiumPoolId: token.raydiumPoolId || null,
    graduationTx: token.graduationTx || null,
    graduatedAt: token.graduatedAt || null,
    solInPool: null,
    tokenInPool: null,
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

export function getDevnetRaydiumUrl(poolId: string): string {
  return `https://explorer.solana.com/address/${poolId}?cluster=devnet`;
}

export async function scanAndGraduatePendingTokens(): Promise<{
  scanned: number;
  graduated: string[];
  failed: { mint: string; error: string }[];
}> {
  const graduated: string[] = [];
  const failed: { mint: string; error: string }[] = [];

  const candidates = await db
    .select()
    .from(tokens)
    .where(eq(tokens.graduationStatus, "pending"));

  let scanned = 0;
  for (const token of candidates) {
    if (token.graduationStatus === "completed" || token.graduationStatus === "migrating") continue;
    scanned++;
    try {
      const result = await checkAndGraduateToken(token.mint);
      if (result?.success) {
        graduated.push(token.mint);
        console.log(`[GraduationScan] Migrated ${token.mint} -> pool ${result.poolId}`);
      } else if (result && !result.success) {
        failed.push({ mint: token.mint, error: result.error || "unknown" });
      }
    } catch (err: any) {
      failed.push({ mint: token.mint, error: err?.message || "scan error" });
    }
  }

  return { scanned, graduated, failed };
}
