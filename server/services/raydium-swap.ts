import { Connection, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { Raydium, TxVersion, CurveCalculator } from "@raydium-io/raydium-sdk-v2";
import BN from "bn.js";
import { db } from "../db";
import { tokens as tokensTable } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getConnection } from "../bonding-curve-client";
import { getFeeRecipientWallet, PLATFORM_FEES } from "../fees";

const getRpcConnection = getConnection;

const WSOL_MINT = "So11111111111111111111111111111111111111112";

interface PoolStats {
  poolId: string;
  baseMint: string;
  quoteMint: string;
  baseSymbol: string;
  quoteSymbol: string;
  baseDecimals: number;
  quoteDecimals: number;
  baseReserve: string;
  quoteReserve: string;
  baseReserveUi: number;
  quoteReserveUi: number;
  priceTokenInSol: number;
  priceSolInToken: number;
  lpSupply: string;
  feeRateBps: number;
  tokenIsBase: boolean;
}

interface SwapQuote {
  inputAmount: string;
  outputAmount: string;
  minOutputAmount: string;
  priceImpactPct: number;
  feeAmount: string;
  platformFeeLamports: string;
  platformFeeBps: number;
  baseIn: boolean;
}

interface BuildSwapResult {
  success: boolean;
  transaction?: string;
  quote?: SwapQuote;
  error?: string;
}

async function loadRaydiumReadOnly(connection: Connection, ownerPubkey?: PublicKey): Promise<Raydium> {
  return await Raydium.load({
    connection,
    owner: ownerPubkey,
    cluster: "devnet",
    disableLoadToken: true,
  });
}

async function resolvePool(mintAddress: string): Promise<{ poolId: string; tokenSymbol: string; tokenDecimals: number } | null> {
  const [row] = await db
    .select()
    .from(tokensTable)
    .where(eq(tokensTable.mint, mintAddress))
    .limit(1);

  if (!row?.raydiumPoolId || row.graduationStatus !== "completed") {
    return null;
  }
  return {
    poolId: row.raydiumPoolId,
    tokenSymbol: row.symbol,
    tokenDecimals: 6,
  };
}

export async function getPoolStats(mintAddress: string): Promise<PoolStats | null> {
  const resolved = await resolvePool(mintAddress);
  if (!resolved) return null;

  const connection = getRpcConnection();
  const raydium = await loadRaydiumReadOnly(connection);

  const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(resolved.poolId);

  const tokenIsBase = poolInfo.mintA.address === mintAddress;
  const baseReserveBn = rpcData.baseReserve;
  const quoteReserveBn = rpcData.quoteReserve;
  const baseDec = poolInfo.mintA.decimals;
  const quoteDec = poolInfo.mintB.decimals;

  const baseReserveUi = Number(baseReserveBn.toString()) / 10 ** baseDec;
  const quoteReserveUi = Number(quoteReserveBn.toString()) / 10 ** quoteDec;

  const tokenReserveUi = tokenIsBase ? baseReserveUi : quoteReserveUi;
  const solReserveUi = tokenIsBase ? quoteReserveUi : baseReserveUi;
  const priceTokenInSol = tokenReserveUi > 0 ? solReserveUi / tokenReserveUi : 0;
  const priceSolInToken = solReserveUi > 0 ? tokenReserveUi / solReserveUi : 0;

  const tradeFeeRateBn = rpcData.configInfo?.tradeFeeRate || new BN(2500);
  const feeRateBps = Math.floor(Number(tradeFeeRateBn.toString()) / 100);

  return {
    poolId: resolved.poolId,
    baseMint: poolInfo.mintA.address,
    quoteMint: poolInfo.mintB.address,
    baseSymbol: poolInfo.mintA.address === WSOL_MINT ? "SOL" : resolved.tokenSymbol,
    quoteSymbol: poolInfo.mintB.address === WSOL_MINT ? "SOL" : resolved.tokenSymbol,
    baseDecimals: baseDec,
    quoteDecimals: quoteDec,
    baseReserve: baseReserveBn.toString(),
    quoteReserve: quoteReserveBn.toString(),
    baseReserveUi,
    quoteReserveUi,
    priceTokenInSol,
    priceSolInToken,
    lpSupply: rpcData.lpAmount?.toString() || "0",
    feeRateBps,
    tokenIsBase,
  };
}

export async function getRecentSwaps(mintAddress: string, limit: number = 20): Promise<Array<{
  signature: string;
  blockTime: number | null;
  side: "buy" | "sell" | "unknown";
  solAmount: number;
  tokenAmount: number;
}>> {
  const resolved = await resolvePool(mintAddress);
  if (!resolved) return [];

  const connection = getRpcConnection();
  const poolPubkey = new PublicKey(resolved.poolId);

  let sigs: any[];
  try {
    sigs = await connection.getSignaturesForAddress(poolPubkey, { limit: Math.min(limit * 2, 50) });
  } catch (err) {
    console.error("[RaydiumSwap] getSignaturesForAddress failed:", err);
    return [];
  }

  const result: Array<any> = [];
  const tokenMintPk = new PublicKey(mintAddress);

  for (const sig of sigs) {
    if (result.length >= limit) break;
    try {
      const tx = await connection.getParsedTransaction(sig.signature, {
        commitment: "confirmed",
        maxSupportedTransactionVersion: 0,
      });
      if (!tx || tx.meta?.err) continue;

      const preBal = tx.meta?.preTokenBalances || [];
      const postBal = tx.meta?.postTokenBalances || [];

      let solDelta = 0;
      let tokenDelta = 0;
      for (const post of postBal) {
        const pre = preBal.find(p => p.accountIndex === post.accountIndex);
        const preAmt = pre ? Number(pre.uiTokenAmount.uiAmountString || "0") : 0;
        const postAmt = Number(post.uiTokenAmount.uiAmountString || "0");
        const delta = postAmt - preAmt;
        if (post.mint === WSOL_MINT && Math.abs(delta) > Math.abs(solDelta)) {
          solDelta = delta;
        } else if (post.mint === mintAddress && Math.abs(delta) > Math.abs(tokenDelta)) {
          tokenDelta = delta;
        }
      }

      let side: "buy" | "sell" | "unknown" = "unknown";
      if (solDelta < 0 && tokenDelta > 0) side = "buy";
      else if (solDelta > 0 && tokenDelta < 0) side = "sell";

      if (side === "unknown") continue;

      result.push({
        signature: sig.signature,
        blockTime: tx.blockTime || null,
        side,
        solAmount: Math.abs(solDelta),
        tokenAmount: Math.abs(tokenDelta),
      });
    } catch (err) {
      continue;
    }
  }

  return result;
}

export async function getSwapQuote(params: {
  mintAddress: string;
  amountIn: string;
  isBuy: boolean;
  slippageBps?: number;
}): Promise<SwapQuote | null> {
  const resolved = await resolvePool(params.mintAddress);
  if (!resolved) return null;

  const connection = getRpcConnection();
  const raydium = await loadRaydiumReadOnly(connection);

  const { poolInfo, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(resolved.poolId);

  const inputMint = params.isBuy ? WSOL_MINT : params.mintAddress;
  const baseIn = poolInfo.mintA.address === inputMint;

  const grossInputBn = new BN(params.amountIn);

  // Platform fee is taken in SOL on both sides:
  //  - BUY (SOL in):    fee comes off the SOL input, swap uses (gross - fee).
  //  - SELL (token in): full token amount is swapped; fee is taken from the
  //                     SOL the user receives.
  const platformFeeBps = PLATFORM_FEES.RAYDIUM_SWAP_BPS;
  const buyPlatformFeeLamports = params.isBuy
    ? grossInputBn.muln(platformFeeBps).divn(10000)
    : new BN(0);
  const swapInputBn = params.isBuy ? grossInputBn.sub(buyPlatformFeeLamports) : grossInputBn;

  if (swapInputBn.lten(0)) return null;

  const tradeFeeRate = rpcData.configInfo?.tradeFeeRate || new BN(2500);
  const protocolFeeRate = rpcData.configInfo?.protocolFeeRate || new BN(0);
  const fundFeeRate = rpcData.configInfo?.fundFeeRate || new BN(0);
  const creatorFeeRate = rpcData.configInfo?.creatorFeeRate || new BN(0);

  const swapResult = CurveCalculator.swapBaseInput(
    swapInputBn,
    baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
    baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
    tradeFeeRate,
    creatorFeeRate,
    protocolFeeRate,
    fundFeeRate,
    false,
  );

  const slippageBps = params.slippageBps ?? 500;
  const rawMinOut = swapResult.outputAmount.muln(10000 - slippageBps).divn(10000);

  // For sell the platform fee comes off the SOL output. We display it relative
  // to the quoted output; the actual on-chain transfer (added in build) is
  // sized off minOut to guarantee the user always has enough SOL to cover it.
  const sellPlatformFeeLamports = !params.isBuy
    ? swapResult.outputAmount.muln(platformFeeBps).divn(10000)
    : new BN(0);
  const platformFeeLamports = params.isBuy ? buyPlatformFeeLamports : sellPlatformFeeLamports;

  const netOutput = !params.isBuy
    ? swapResult.outputAmount.sub(sellPlatformFeeLamports)
    : swapResult.outputAmount;
  const netMinOut = !params.isBuy
    ? rawMinOut.sub(rawMinOut.muln(platformFeeBps).divn(10000))
    : rawMinOut;

  const inputReserveBn = baseIn ? rpcData.baseReserve : rpcData.quoteReserve;
  const outputReserveBn = baseIn ? rpcData.quoteReserve : rpcData.baseReserve;
  const inputDec = baseIn ? poolInfo.mintA.decimals : poolInfo.mintB.decimals;
  const outputDec = baseIn ? poolInfo.mintB.decimals : poolInfo.mintA.decimals;

  const spotPrice = (Number(outputReserveBn.toString()) / 10 ** outputDec) /
                    (Number(inputReserveBn.toString()) / 10 ** inputDec);
  const execIn = Number(swapInputBn.toString()) / 10 ** inputDec;
  const execOut = Number(swapResult.outputAmount.toString()) / 10 ** outputDec;
  const execPrice = execIn > 0 ? execOut / execIn : 0;
  const priceImpactPct = spotPrice > 0 ? Math.max(0, (1 - execPrice / spotPrice) * 100) : 0;

  return {
    inputAmount: grossInputBn.toString(),
    outputAmount: netOutput.toString(),
    minOutputAmount: netMinOut.toString(),
    priceImpactPct,
    feeAmount: swapResult.tradeFee.toString(),
    platformFeeLamports: platformFeeLamports.toString(),
    platformFeeBps,
    baseIn,
  };
}

export async function buildSwapTransaction(params: {
  userWallet: string;
  mintAddress: string;
  amountIn: string;
  isBuy: boolean;
  slippageBps?: number;
}): Promise<BuildSwapResult> {
  try {
    const resolved = await resolvePool(params.mintAddress);
    if (!resolved) {
      return { success: false, error: "Token has not graduated to Raydium yet" };
    }

    const connection = getRpcConnection();
    const userPubkey = new PublicKey(params.userWallet);
    const raydium = await loadRaydiumReadOnly(connection, userPubkey);

    const { poolInfo, poolKeys, rpcData } = await raydium.cpmm.getPoolInfoFromRpc(resolved.poolId);

    const inputMint = params.isBuy ? WSOL_MINT : params.mintAddress;
    const baseIn = poolInfo.mintA.address === inputMint;

    const grossInputBn = new BN(params.amountIn);
    if (grossInputBn.lten(0)) {
      return { success: false, error: "Invalid input amount" };
    }

    // Platform fee math (matches getSwapQuote):
    //  - BUY:  fee comes off the SOL input. Swap actually uses (gross - fee).
    //  - SELL: full token amount swapped; fee deducted from SOL output via
    //          a SystemProgram.transfer appended after the swap.
    const platformFeeBps = PLATFORM_FEES.RAYDIUM_SWAP_BPS;
    const buyPlatformFeeLamports = params.isBuy
      ? grossInputBn.muln(platformFeeBps).divn(10000)
      : new BN(0);
    const swapInputBn = params.isBuy ? grossInputBn.sub(buyPlatformFeeLamports) : grossInputBn;
    if (swapInputBn.lten(0)) {
      return { success: false, error: "Amount too small after platform fee" };
    }

    const tradeFeeRate = rpcData.configInfo?.tradeFeeRate || new BN(2500);
    const protocolFeeRate = rpcData.configInfo?.protocolFeeRate || new BN(0);
    const fundFeeRate = rpcData.configInfo?.fundFeeRate || new BN(0);
    const creatorFeeRate = rpcData.configInfo?.creatorFeeRate || new BN(0);

    const swapResult = CurveCalculator.swapBaseInput(
      swapInputBn,
      baseIn ? rpcData.baseReserve : rpcData.quoteReserve,
      baseIn ? rpcData.quoteReserve : rpcData.baseReserve,
      tradeFeeRate,
      creatorFeeRate,
      protocolFeeRate,
      fundFeeRate,
      false,
    );

    if (swapResult.outputAmount.lten(0)) {
      return { success: false, error: "Output amount too small - try a larger trade" };
    }

    const slippageBps = params.slippageBps ?? 500;
    const slippageDecimal = slippageBps / 10000;

    const built = await raydium.cpmm.swap({
      poolInfo,
      poolKeys,
      inputAmount: swapInputBn,
      swapResult,
      slippage: slippageDecimal,
      baseIn,
      txVersion: TxVersion.LEGACY,
      feePayer: userPubkey,
    });

    const tx = (built as any).transaction as Transaction;
    if (!tx) {
      return { success: false, error: "SDK did not return a transaction" };
    }

    if (!tx.feePayer) tx.feePayer = userPubkey;
    if (!tx.recentBlockhash) {
      const { blockhash } = await connection.getLatestBlockhash("finalized");
      tx.recentBlockhash = blockhash;
    }

    // Inject platform fee transfer.
    //  - BUY: prepend (charge fee BEFORE the swap consumes user SOL).
    //  - SELL: append (the SOL output materialises after Raydium's
    //          closeAccount unwraps wSOL back to native SOL on the user's
    //          account, then we transfer a slice to the fee recipient).
    // For SELL we size the on-chain transfer off minOut so the tx never
    // under-funds even at worst-case slippage.
    const rawMinOut = swapResult.outputAmount.muln(10000 - slippageBps).divn(10000);
    const sellPlatformFeeLamportsForTx = !params.isBuy
      ? rawMinOut.muln(platformFeeBps).divn(10000)
      : new BN(0);
    const feeRecipient = getFeeRecipientWallet();

    if (params.isBuy && buyPlatformFeeLamports.gtn(0)) {
      const feeIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: feeRecipient,
        lamports: BigInt(buyPlatformFeeLamports.toString()),
      });
      tx.instructions = [feeIx, ...tx.instructions];
    } else if (!params.isBuy && sellPlatformFeeLamportsForTx.gtn(0)) {
      const feeIx = SystemProgram.transfer({
        fromPubkey: userPubkey,
        toPubkey: feeRecipient,
        lamports: BigInt(sellPlatformFeeLamportsForTx.toString()),
      });
      tx.add(feeIx);
    }

    const serialized = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const base64Tx = serialized.toString("base64");

    const inputDec = baseIn ? poolInfo.mintA.decimals : poolInfo.mintB.decimals;
    const outputDec = baseIn ? poolInfo.mintB.decimals : poolInfo.mintA.decimals;
    const inputReserveBn = baseIn ? rpcData.baseReserve : rpcData.quoteReserve;
    const outputReserveBn = baseIn ? rpcData.quoteReserve : rpcData.baseReserve;

    const spotPrice = (Number(outputReserveBn.toString()) / 10 ** outputDec) /
                      (Number(inputReserveBn.toString()) / 10 ** inputDec);
    const execIn = Number(swapInputBn.toString()) / 10 ** inputDec;
    const execOut = Number(swapResult.outputAmount.toString()) / 10 ** outputDec;
    const execPrice = execIn > 0 ? execOut / execIn : 0;
    const priceImpactPct = spotPrice > 0 ? Math.max(0, (1 - execPrice / spotPrice) * 100) : 0;

    // Quote returned to client reflects the user-visible input/output
    // (gross SOL in for BUY, post-fee SOL out for SELL).
    const sellPlatformFeeLamportsForQuote = !params.isBuy
      ? swapResult.outputAmount.muln(platformFeeBps).divn(10000)
      : new BN(0);
    const platformFeeLamports = params.isBuy ? buyPlatformFeeLamports : sellPlatformFeeLamportsForQuote;
    const netOutput = !params.isBuy
      ? swapResult.outputAmount.sub(sellPlatformFeeLamportsForQuote)
      : swapResult.outputAmount;
    const netMinOut = !params.isBuy
      ? rawMinOut.sub(sellPlatformFeeLamportsForTx)
      : rawMinOut;

    return {
      success: true,
      transaction: base64Tx,
      quote: {
        inputAmount: grossInputBn.toString(),
        outputAmount: netOutput.toString(),
        minOutputAmount: netMinOut.toString(),
        priceImpactPct,
        feeAmount: swapResult.tradeFee.toString(),
        platformFeeLamports: platformFeeLamports.toString(),
        platformFeeBps,
        baseIn,
      },
    };
  } catch (err: any) {
    console.error("[RaydiumSwap] buildSwapTransaction error:", err);
    const raw = String(err?.message || err);
    let friendly = raw;
    if (raw.includes("user do not have token account") || raw.includes("do not have token account")) {
      friendly = params.isBuy
        ? "Could not prepare your wallet to receive this token - please try again."
        : `You do not hold any ${params.mintAddress.slice(0, 4)}... tokens to sell.`;
    } else if (raw.toLowerCase().includes("blockhash")) {
      friendly = "Network is busy - please try again in a moment.";
    }
    return { success: false, error: friendly };
  }
}
