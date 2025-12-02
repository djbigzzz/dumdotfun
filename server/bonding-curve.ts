import BN from "bn.js";

// Bonding curve constants (Pump.fun style)
export const BONDING_CURVE_CONSTANTS = {
  // Initial virtual reserves
  INITIAL_VIRTUAL_TOKEN_RESERVES: new BN("1073000000000000"), // 1.073B tokens (with 6 decimals)
  INITIAL_VIRTUAL_SOL_RESERVES: new BN("30000000000"), // 30 SOL (with 9 decimals)
  INITIAL_REAL_TOKEN_RESERVES: new BN("793100000000000"), // 793.1M tokens for sale
  
  // Migration threshold
  MIGRATION_FEE_LAMPORTS: new BN("6000000000"), // 6 SOL migration fee
  MIGRATION_THRESHOLD_SOL: new BN("85000000000"), // 85 SOL triggers migration
  
  // Fees
  TRADING_FEE_BPS: 100, // 1% trading fee (100 basis points)
  
  // Token decimals
  TOKEN_DECIMALS: 6,
  SOL_DECIMALS: 9,
};

export interface BondingCurveState {
  virtualTokenReserves: BN;
  virtualSolReserves: BN;
  realTokenReserves: BN;
  realSolReserves: BN;
  tokenTotalSupply: BN;
  complete: boolean;
}

export interface TradeQuote {
  inputAmount: BN;
  outputAmount: BN;
  priceImpact: number;
  fee: BN;
  newPrice: number;
}

/**
 * Calculate buy quote - how many tokens you get for SOL
 * Uses constant product formula: x * y = k
 */
export function calculateBuyQuote(
  solAmount: BN,
  curveState: BondingCurveState
): TradeQuote {
  if (curveState.complete) {
    throw new Error("Bonding curve is complete - trade on DEX instead");
  }

  // Calculate fee
  const feeAmount = solAmount.mul(new BN(BONDING_CURVE_CONSTANTS.TRADING_FEE_BPS)).div(new BN(10000));
  const solAfterFee = solAmount.sub(feeAmount);

  // Constant product formula: (x + dx) * (y - dy) = x * y
  // Solving for dy: dy = y * dx / (x + dx)
  const { virtualTokenReserves, virtualSolReserves } = curveState;
  
  const tokensOut = virtualTokenReserves
    .mul(solAfterFee)
    .div(virtualSolReserves.add(solAfterFee));

  // Cap tokens out to available real reserves
  const cappedTokensOut = BN.min(tokensOut, curveState.realTokenReserves);

  // Calculate price impact
  const oldPrice = virtualSolReserves.toNumber() / virtualTokenReserves.toNumber();
  const newVirtualSol = virtualSolReserves.add(solAfterFee);
  const newVirtualToken = virtualTokenReserves.sub(cappedTokensOut);
  const newPrice = newVirtualSol.toNumber() / newVirtualToken.toNumber();
  const priceImpact = ((newPrice - oldPrice) / oldPrice) * 100;

  return {
    inputAmount: solAmount,
    outputAmount: cappedTokensOut,
    priceImpact,
    fee: feeAmount,
    newPrice,
  };
}

/**
 * Calculate sell quote - how much SOL you get for tokens
 */
export function calculateSellQuote(
  tokenAmount: BN,
  curveState: BondingCurveState
): TradeQuote {
  if (curveState.complete) {
    throw new Error("Bonding curve is complete - trade on DEX instead");
  }

  const { virtualTokenReserves, virtualSolReserves } = curveState;

  // Constant product formula: (x - dx) * (y + dy) = x * y
  // Solving for dy: dy = y * dx / (x + dx) but for sell direction
  const solOut = virtualSolReserves
    .mul(tokenAmount)
    .div(virtualTokenReserves.add(tokenAmount));

  // Calculate fee
  const feeAmount = solOut.mul(new BN(BONDING_CURVE_CONSTANTS.TRADING_FEE_BPS)).div(new BN(10000));
  const solAfterFee = solOut.sub(feeAmount);

  // Calculate price impact
  const oldPrice = virtualSolReserves.toNumber() / virtualTokenReserves.toNumber();
  const newVirtualSol = virtualSolReserves.sub(solOut);
  const newVirtualToken = virtualTokenReserves.add(tokenAmount);
  const newPrice = newVirtualSol.toNumber() / newVirtualToken.toNumber();
  const priceImpact = ((oldPrice - newPrice) / oldPrice) * 100;

  return {
    inputAmount: tokenAmount,
    outputAmount: solAfterFee,
    priceImpact,
    fee: feeAmount,
    newPrice,
  };
}

/**
 * Calculate current token price in SOL
 */
export function calculateTokenPrice(curveState: BondingCurveState): number {
  const { virtualTokenReserves, virtualSolReserves } = curveState;
  // Price per token = virtualSolReserves / virtualTokenReserves
  // Adjusted for decimals
  const priceInLamports = virtualSolReserves.toNumber() / virtualTokenReserves.toNumber();
  return priceInLamports * Math.pow(10, BONDING_CURVE_CONSTANTS.TOKEN_DECIMALS - BONDING_CURVE_CONSTANTS.SOL_DECIMALS);
}

/**
 * Calculate bonding curve progress percentage
 */
export function calculateProgress(curveState: BondingCurveState): number {
  if (curveState.complete) return 100;
  
  const { realSolReserves } = curveState;
  const threshold = BONDING_CURVE_CONSTANTS.MIGRATION_THRESHOLD_SOL;
  
  return Math.min(100, (realSolReserves.toNumber() / threshold.toNumber()) * 100);
}

/**
 * Calculate market cap in SOL
 */
export function calculateMarketCap(curveState: BondingCurveState): number {
  const price = calculateTokenPrice(curveState);
  const totalSupply = curveState.tokenTotalSupply.toNumber() / Math.pow(10, BONDING_CURVE_CONSTANTS.TOKEN_DECIMALS);
  return price * totalSupply;
}

/**
 * Create initial bonding curve state for a new token
 */
export function createInitialCurveState(): BondingCurveState {
  return {
    virtualTokenReserves: BONDING_CURVE_CONSTANTS.INITIAL_VIRTUAL_TOKEN_RESERVES,
    virtualSolReserves: BONDING_CURVE_CONSTANTS.INITIAL_VIRTUAL_SOL_RESERVES,
    realTokenReserves: BONDING_CURVE_CONSTANTS.INITIAL_REAL_TOKEN_RESERVES,
    realSolReserves: new BN(0),
    tokenTotalSupply: new BN("1000000000000000"), // 1B tokens with 6 decimals
    complete: false,
  };
}

/**
 * Format lamports to SOL string
 */
export function lamportsToSol(lamports: BN | number): string {
  const value = typeof lamports === "number" ? lamports : lamports.toNumber();
  return (value / 1e9).toFixed(9);
}

/**
 * Format token amount to readable string
 */
export function formatTokenAmount(amount: BN | number): string {
  const value = typeof amount === "number" ? amount : amount.toNumber();
  return (value / 1e6).toLocaleString();
}
