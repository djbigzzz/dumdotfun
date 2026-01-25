/**
 * Radr ShadowWire - Private Transfers Integration (Hackathon-Ready)
 *
 * Based on https://github.com/Radrdotfun/ShadowWire
 *
 * Features:
 * - Hidden transfer amounts using ZK Bulletproofs
 * - Internal transfers: amount hidden
 * - External transfers: sender anonymous (amount visible)
 * - Client-side WASM proof generation
 * - Wallet signature authentication required
 */

// Supported tokens from ShadowWire README (22 tokens)
const SUPPORTED_TOKENS = [
  "SOL", "RADR", "USDC", "ORE", "BONK", "JIM", "GODL",
  "HUSTLE", "ZEC", "CRT", "BLACKCOIN", "GIL", "ANON",
  "WLFI", "USD1", "AOL", "IQLABS", "SANA", "POKI",
  "RAIN", "HOSICO", "SKR",
] as const;

export type SupportedToken = typeof SUPPORTED_TOKENS[number];

export interface SignMessageFn {
  (message: Uint8Array): Promise<Uint8Array>;
}

export const SHADOWWIRE_CONFIG = {
  name: "Radr ShadowWire",
  version: "1.1.1",
  description: "Private transfers on Solana using zero-knowledge Bulletproofs",
  bounty: "$15,000",
  category: "Private Transfers",
  status: "active" as const,
  features: [
    "Hidden transfer amounts using ZK proofs",
    `${SUPPORTED_TOKENS.length} supported tokens`,
    "Internal transfers (amount hidden)",
    "External transfers (sender anonymous - amount visible)",
    "Client-side proof generation via WASM",
    "Wallet signature authentication required",
  ],
  supportedTokens: [...SUPPORTED_TOKENS] as string[],
  docs: "https://github.com/Radrdotfun/ShadowWire",
};

let shadowWireClient: any = null;
let shadowWireInitAttemptedAt: number | null = null;
const RETRY_DELAY_MS = 30_000; // Retry after 30 seconds on failure

function isTokenSupported(token: string): token is SupportedToken {
  return (SUPPORTED_TOKENS as readonly string[]).includes(token);
}

async function getShadowWireClient() {
  const now = Date.now();

  if (shadowWireClient) return shadowWireClient;

  // If init failed recently, wait before retrying
  if (shadowWireInitAttemptedAt && now - shadowWireInitAttemptedAt < RETRY_DELAY_MS) {
    return null;
  }

  try {
    console.log("[ShadowWire] Initializing ShadowWire SDK...");
    shadowWireInitAttemptedAt = now;

    const shadowwire = await import("@radr/shadowwire");

    shadowWireClient = new shadowwire.ShadowWireClient({
      debug: process.env.NODE_ENV === "development",
    });

    console.log("[ShadowWire] ✓ Successfully initialized ShadowWire SDK");
    console.log(`[ShadowWire] Supported tokens: ${SUPPORTED_TOKENS.length}`);
    return shadowWireClient;
  } catch (error) {
    console.error("[ShadowWire] ✗ Failed to initialize ShadowWire client:", error);
    return null;
  }
}

// ---- SDK-call wrappers to be robust across SDK signature changes ----

async function toSmallestUnit(amountUi: number, token: SupportedToken): Promise<number> {
  const { TokenUtils } = await import("@radr/shadowwire");
  // Type assertion needed for newer tokens not in older SDK typings
  return TokenUtils.toSmallestUnit(amountUi, token as any);
}

async function callDeposit(
  client: any,
  walletAddress: string,
  signMessage: SignMessageFn,
  amountSmallest: number,
  token: SupportedToken
) {
  // Some SDK versions may accept wallet as string (README),
  // others may accept wallet object with signMessage.
  try {
    return await client.deposit({
      wallet: { address: walletAddress, signMessage },
      amount: amountSmallest,
      token,
    });
  } catch {
    return await client.deposit({
      wallet: walletAddress,
      amount: amountSmallest,
      token,
    });
  }
}

async function callWithdraw(
  client: any,
  walletAddress: string,
  signMessage: SignMessageFn,
  amountSmallest: number,
  token: SupportedToken
) {
  try {
    return await client.withdraw({
      wallet: { address: walletAddress, signMessage },
      amount: amountSmallest,
      token,
    });
  } catch {
    return await client.withdraw({
      wallet: walletAddress,
      amount: amountSmallest,
      token,
    });
  }
}

// ---- Types ----

export interface ShadowWireTransferParams {
  senderAddress: string;
  recipientAddress: string;
  amount: number; // UI units (e.g. 0.1 SOL)
  token: string;  // validated to SupportedToken
  type: "internal" | "external";
}

export interface ShadowWireBalance {
  available: number;
  poolAddress: string;
  token: SupportedToken;
}

// ---- Public API ----

export async function getShadowWireStatus(): Promise<{
  active: boolean;
  name: string;
  bounty: string;
  description: string;
  supportedTokens: string[];
  tokenCount: number;
}> {
  const client = await getShadowWireClient();
  return {
    active: client !== null,
    name: SHADOWWIRE_CONFIG.name,
    bounty: SHADOWWIRE_CONFIG.bounty,
    description: SHADOWWIRE_CONFIG.description,
    supportedTokens: [...SUPPORTED_TOKENS],
    tokenCount: SUPPORTED_TOKENS.length,
  };
}

/**
 * Prepare a ShadowWire transfer (quote/preview)
 * Use executeShadowWireTransfer() to actually execute with wallet signature
 */
export async function prepareShadowWireTransfer(params: ShadowWireTransferParams): Promise<{
  success: boolean;
  message: string;
  amountHidden: boolean;
  senderAnonymous: boolean;
  requiresWalletSignature: boolean;
  transferParams?: any;
  feePercentage?: number;
  minimumAmount?: number;
}> {
  try {
    if (!isTokenSupported(params.token)) {
      return {
        success: false,
        message: `Token "${params.token}" is not supported. Supported: ${SUPPORTED_TOKENS.join(", ")}`,
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false,
      };
    }

    const token: SupportedToken = params.token;

    const client = await getShadowWireClient();
    if (!client) {
      return {
        success: false,
        message: "ShadowWire SDK not available - install @radr/shadowwire",
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false,
      };
    }

    console.log(`[ShadowWire] Preparing ${params.type} transfer: ${params.amount} ${token}`);

    const isInternal = params.type === "internal";

    const feePercentage = client.getFeePercentage(token);
    const minimumAmount = client.getMinimumAmount(token);

    if (params.amount < minimumAmount) {
      return {
        success: false,
        message: `Amount must be at least ${minimumAmount} ${token}`,
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false,
        feePercentage,
        minimumAmount,
      };
    }

    const feeCosts = client.calculateFee(params.amount, token);

    // Semantics (based on ShadowWire README):
    // - Internal: amount hidden (sender visible)
    // - External: sender anonymous (amount visible)
    const amountHidden = isInternal;
    const senderAnonymous = !isInternal;

    const privacyLabel = isInternal ? "amount hidden" : "sender anonymous";

    // Normalize fee display
    const totalFee = feeCosts?.totalFee ?? feeCosts?.total ?? null;
    const feePart = totalFee != null ? ` Fee: ${totalFee} ${token}.` : "";

    return {
      success: true,
      message: `Ready to transfer ${params.amount} ${token} via ShadowWire (${privacyLabel}).${feePart} Wallet signature required.`,
      amountHidden,
      senderAnonymous,
      requiresWalletSignature: true,
      feePercentage,
      minimumAmount,
      transferParams: {
        sender: params.senderAddress,
        recipient: params.recipientAddress,
        amount: params.amount,
        token,
        type: params.type,
        fee: feeCosts,
      },
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing transfer:", error);
    return {
      success: false,
      message: error?.message || "Failed to prepare ShadowWire transfer",
      amountHidden: false,
      senderAnonymous: false,
      requiresWalletSignature: false,
    };
  }
}

/**
 * Execute a ShadowWire transfer with wallet signature
 */
export async function executeShadowWireTransfer(
  params: ShadowWireTransferParams,
  signMessage: SignMessageFn
): Promise<{
  success: boolean;
  message: string;
  signatureOrHash?: string;
}> {
  try {
    if (!isTokenSupported(params.token)) {
      return { success: false, message: `Token "${params.token}" is not supported.` };
    }
    const token: SupportedToken = params.token;

    const client = await getShadowWireClient();
    if (!client) return { success: false, message: "ShadowWire SDK not available" };

    console.log(`[ShadowWire] Executing ${params.type} transfer: ${params.amount} ${token}`);

    const result = await client.transfer({
      sender: params.senderAddress,
      recipient: params.recipientAddress,
      amount: params.amount,
      token,
      type: params.type,
      wallet: { signMessage },
    });

    const signatureOrHash =
      result?.signature ?? result?.txHash ?? result?.transactionHash ?? result?.hash;

    return {
      success: true,
      message: `Successfully transferred ${params.amount} ${token}`,
      signatureOrHash,
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing transfer:", error);
    return { success: false, message: error?.message || "Failed to execute ShadowWire transfer" };
  }
}

export async function getShadowWireBalance(
  walletAddress: string,
  tokenInput: string = "SOL"
): Promise<ShadowWireBalance | null> {
  try {
    if (!isTokenSupported(tokenInput)) {
      console.log(`[ShadowWire] Token "${tokenInput}" not supported for balance check`);
      return null;
    }
    const token: SupportedToken = tokenInput;

    const client = await getShadowWireClient();
    if (!client) return null;

    const balance = await client.getBalance(walletAddress, token);

    return {
      available: Number(balance?.available || 0),
      poolAddress: String(balance?.pool_address || ""),
      token,
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error getting balance:", error);
    return null;
  }
}

/**
 * Prepare a deposit request (quote/preview)
 * Use executeShadowWireDeposit() to actually execute with wallet
 */
export async function prepareShadowWireDeposit(
  walletAddress: string,
  amount: number,
  tokenInput: string = "SOL"
): Promise<{
  success: boolean;
  message: string;
  depositRequest?: { wallet: string; amountSmallest: number; token: SupportedToken };
  feeInfo?: { percentage: number; minimum: number; costs: any };
}> {
  try {
    if (!isTokenSupported(tokenInput)) {
      return {
        success: false,
        message: `Token "${tokenInput}" is not supported. Supported: ${SUPPORTED_TOKENS.join(", ")}`,
      };
    }
    const token: SupportedToken = tokenInput;

    const client = await getShadowWireClient();
    if (!client) return { success: false, message: "ShadowWire SDK not available - install @radr/shadowwire" };

    const feePercentage = client.getFeePercentage(token);
    const minimumAmount = client.getMinimumAmount(token);

    if (amount < minimumAmount) {
      return { success: false, message: `Amount must be at least ${minimumAmount} ${token}` };
    }

    const feeCosts = client.calculateFee(amount, token);
    const amountSmallest = await toSmallestUnit(amount, token);

    return {
      success: true,
      message: `Ready to deposit ${amount} ${token}. Fee: ${feeCosts.totalFee} ${token}. Wallet signature required.`,
      depositRequest: { wallet: walletAddress, amountSmallest, token },
      feeInfo: { percentage: feePercentage, minimum: minimumAmount, costs: feeCosts },
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing deposit:", error);
    return { success: false, message: error?.message || "Failed to prepare deposit" };
  }
}

/**
 * Execute a deposit with wallet signature
 */
export async function executeShadowWireDeposit(
  walletAddress: string,
  amount: number,
  tokenInput: string,
  signMessage: SignMessageFn
): Promise<{ success: boolean; message: string; signatureOrHash?: string }> {
  try {
    if (!isTokenSupported(tokenInput)) return { success: false, message: `Token "${tokenInput}" is not supported.` };
    const token: SupportedToken = tokenInput;

    const client = await getShadowWireClient();
    if (!client) return { success: false, message: "ShadowWire SDK not available" };

    const amountSmallest = await toSmallestUnit(amount, token);
    const result = await callDeposit(client, walletAddress, signMessage, amountSmallest, token);

    const signatureOrHash =
      result?.signature ?? result?.txHash ?? result?.transactionHash ?? result?.hash;

    return { success: true, message: `Successfully deposited ${amount} ${token}`, signatureOrHash };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing deposit:", error);
    return { success: false, message: error?.message || "Failed to execute deposit" };
  }
}

/**
 * Prepare a withdrawal request (quote/preview)
 * Use executeShadowWireWithdraw() to actually execute with wallet
 */
export async function prepareShadowWireWithdraw(
  walletAddress: string,
  amount: number,
  tokenInput: string = "SOL"
): Promise<{
  success: boolean;
  message: string;
  withdrawRequest?: { wallet: string; amountSmallest: number; token: SupportedToken };
  feeInfo?: { percentage: number; minimum: number; costs: any };
}> {
  try {
    if (!isTokenSupported(tokenInput)) {
      return {
        success: false,
        message: `Token "${tokenInput}" is not supported. Supported: ${SUPPORTED_TOKENS.join(", ")}`,
      };
    }
    const token: SupportedToken = tokenInput;

    const client = await getShadowWireClient();
    if (!client) return { success: false, message: "ShadowWire SDK not available - install @radr/shadowwire" };

    const feePercentage = client.getFeePercentage(token);
    const minimumAmount = client.getMinimumAmount(token);

    if (amount < minimumAmount) {
      return { success: false, message: `Amount must be at least ${minimumAmount} ${token}` };
    }

    const feeCosts = client.calculateFee(amount, token);
    const amountSmallest = await toSmallestUnit(amount, token);

    return {
      success: true,
      message: `Ready to withdraw ${amount} ${token}. Fee: ${feeCosts.totalFee} ${token}. Wallet signature required.`,
      withdrawRequest: { wallet: walletAddress, amountSmallest, token },
      feeInfo: { percentage: feePercentage, minimum: minimumAmount, costs: feeCosts },
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing withdrawal:", error);
    return { success: false, message: error?.message || "Failed to prepare withdrawal" };
  }
}

/**
 * Execute a withdrawal with wallet signature
 */
export async function executeShadowWireWithdraw(
  walletAddress: string,
  amount: number,
  tokenInput: string,
  signMessage: SignMessageFn
): Promise<{ success: boolean; message: string; signatureOrHash?: string }> {
  try {
    if (!isTokenSupported(tokenInput)) return { success: false, message: `Token "${tokenInput}" is not supported.` };
    const token: SupportedToken = tokenInput;

    const client = await getShadowWireClient();
    if (!client) return { success: false, message: "ShadowWire SDK not available" };

    const amountSmallest = await toSmallestUnit(amount, token);
    const result = await callWithdraw(client, walletAddress, signMessage, amountSmallest, token);

    const signatureOrHash =
      result?.signature ?? result?.txHash ?? result?.transactionHash ?? result?.hash;

    return { success: true, message: `Successfully withdrew ${amount} ${token}`, signatureOrHash };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing withdrawal:", error);
    return { success: false, message: error?.message || "Failed to execute withdrawal" };
  }
}

export function getShadowWireIntegration() {
  return {
    id: "shadowwire",
    ...SHADOWWIRE_CONFIG,
    tokenCount: SUPPORTED_TOKENS.length,
    endpoints: {
      transfer: "/api/privacy/shadowwire/transfer",
      balance: "/api/privacy/shadowwire/balance/:wallet",
      deposit: "/api/privacy/shadowwire/deposit",
      withdraw: "/api/privacy/shadowwire/withdraw",
    },
  };
}
