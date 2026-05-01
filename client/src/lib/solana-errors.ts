// Translate raw Solana / Anchor / Raydium error blobs into human messages.
//
// Anchor / on-chain errors usually arrive as:
//   { InstructionError: [ixIndex, { Custom: code }] }
// or as a stringified version of the same. We extract the code and map it
// based on the calling context (the user-facing flow that produced it),
// because the same numeric code means different things in different programs.

export type ErrorContext = "create" | "trade" | "raydium" | "generic";

interface ParsedOnChain {
  ixIndex: number | null;
  customCode: number | null;
  raw: string;
}

function parseOnChainError(raw: string): ParsedOnChain {
  const ixMatch = raw.match(/InstructionError"?\s*[:,]\s*\[\s*(\d+)/);
  const customMatch = raw.match(/"Custom"\s*:\s*(\d+)/);
  return {
    ixIndex: ixMatch ? parseInt(ixMatch[1], 10) : null,
    customCode: customMatch ? parseInt(customMatch[1], 10) : null,
    raw,
  };
}

// Bonding curve program (Anchor) errors - from server/bonding-curve-idl.json
const BONDING_CURVE_ERRORS: Record<number, string> = {
  6000: "This token has already graduated to Raydium - use the swap panel instead.",
  6001: "Amount is invalid - try a different amount.",
  6002: "Price moved past your slippage tolerance. Try a higher slippage or smaller amount.",
  6003: "The bonding curve doesn't have enough liquidity for this trade.",
  6004: "You're not authorized to perform this action.",
  6005: "Invalid fee recipient configured.",
};

// Raydium CPMM common rejections.
const RAYDIUM_ERRORS: Record<number, string> = {
  0: "Price moved past your slippage tolerance. Try a higher slippage or a smaller amount.",
  1: "Pool input too small to produce any output. Try a larger amount.",
  6000: "Slippage exceeded - the price moved while your swap was pending.",
  6001: "Pool is paused or has zero liquidity right now.",
  6002: "Amount too small for this pool.",
};

// Common system program Custom codes seen during account creation.
const SYSTEM_PROGRAM_ERRORS: Record<number, string> = {
  0: "Token address conflict (another token just claimed it). Click Create again to grab a new address.",
  1: "Not enough SOL to create this account.",
  2: "Invalid program account.",
  3: "Invalid argument.",
};

function commonStringHints(raw: string): string | null {
  if (raw.includes("BlockhashNotFound") || raw.includes("blockhash not found")) {
    return "Transaction expired before landing. Please try again.";
  }
  if (raw.includes("already been processed")) {
    return "Transaction was already submitted - check your wallet history.";
  }
  if (/insufficient.*lamports|InsufficientFundsForRent|insufficient funds/i.test(raw)) {
    return "Not enough SOL to cover this transaction and fees.";
  }
  if (/User rejected|rejected the request|wallet.*reject/i.test(raw)) {
    return "You cancelled the transaction in your wallet.";
  }
  if (raw.includes("Simulation failed")) {
    return "Transaction simulation failed - the network may be congested. Please try again.";
  }
  if (raw.includes("Network request failed") || raw.includes("Failed to fetch")) {
    return "Network connection issue. Please check your connection and try again.";
  }
  return null;
}

export function translateSolanaError(
  rawError: string | Error | unknown,
  context: ErrorContext = "generic",
): string {
  const raw = rawError instanceof Error
    ? rawError.message
    : typeof rawError === "string"
      ? rawError
      : String(rawError);

  const stringHint = commonStringHints(raw);
  if (stringHint) return stringHint;

  const parsed = parseOnChainError(raw);

  if (parsed.customCode !== null) {
    const code = parsed.customCode;

    if (context === "raydium") {
      if (RAYDIUM_ERRORS[code]) return RAYDIUM_ERRORS[code];
    } else if (context === "trade") {
      if (BONDING_CURVE_ERRORS[code]) return BONDING_CURVE_ERRORS[code];
    } else if (context === "create") {
      // Token creation hits the system program first (createAccount), then
      // SPL token init, then the bonding curve init. ixIndex 0 is almost
      // always the system program createAccount.
      if (parsed.ixIndex === 0 && SYSTEM_PROGRAM_ERRORS[code]) {
        return SYSTEM_PROGRAM_ERRORS[code];
      }
      if (BONDING_CURVE_ERRORS[code]) return BONDING_CURVE_ERRORS[code];
      if (code === 0) {
        return "Couldn't initialize the token account. Make sure you have enough SOL and try again.";
      }
    }

    return `Transaction rejected (code ${code}). Please try again - if it keeps happening, try a smaller amount or check your balance.`;
  }

  if (raw.includes("InstructionError")) {
    return "Transaction failed on chain. Please try again.";
  }

  // Strip noisy framing if present.
  const cleaned = raw
    .replace(/^Error:\s*/i, "")
    .replace(/^failed to send transaction:\s*/i, "")
    .trim();
  return cleaned.length > 200 ? "Something went wrong. Please try again." : cleaned;
}
