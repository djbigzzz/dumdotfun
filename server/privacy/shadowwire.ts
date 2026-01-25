/**
 * Radr ShadowWire - Private Transfers Integration (Hackathon-Ready)
 * 
 * Based on https://github.com/Radrdotfun/ShadowWire
 * 
 * Features:
 * - Hidden transfer amounts using ZK Bulletproofs
 * - Internal transfers: fully private (amount hidden)
 * - External transfers: sender anonymous (amount visible)
 * - Client-side WASM proof generation
 * - Wallet signature authentication required
 */

// Supported tokens from ShadowWire README (22 tokens)
const SUPPORTED_TOKENS = [
  "SOL", "RADR", "USDC", "ORE", "BONK", "JIM", "GODL",
  "HUSTLE", "ZEC", "CRT", "BLACKCOIN", "GIL", "ANON",
  "WLFI", "USD1", "AOL", "IQLABS", "SANA", "POKI", 
  "RAIN", "HOSICO", "SKR"
] as const;

export type SupportedToken = typeof SUPPORTED_TOKENS[number];

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
    "Internal transfers (fully private - amount hidden)",
    "External transfers (sender anonymous - amount visible)",
    "Client-side proof generation via WASM",
    "Wallet signature authentication required"
  ],
  supportedTokens: SUPPORTED_TOKENS as unknown as string[],
  docs: "https://github.com/Radrdotfun/ShadowWire"
};

let shadowWireClient: any = null;
let shadowWireInitAttemptedAt: number | null = null;
const RETRY_DELAY_MS = 30000; // Retry after 30 seconds on failure

async function getShadowWireClient() {
  const now = Date.now();
  
  // If we have a working client, return it
  if (shadowWireClient) {
    return shadowWireClient;
  }
  
  // If initialization failed recently, wait before retrying
  if (shadowWireInitAttemptedAt && (now - shadowWireInitAttemptedAt) < RETRY_DELAY_MS) {
    return null;
  }
  
  try {
    console.log("[ShadowWire] Initializing ShadowWire SDK...");
    shadowWireInitAttemptedAt = now;
    
    const shadowwire = await import("@radr/shadowwire");

    // Initialize ShadowWire client
    shadowWireClient = new shadowwire.ShadowWireClient({
      debug: process.env.NODE_ENV === "development"
    });

    console.log("[ShadowWire] ✓ Successfully initialized ShadowWire SDK");
    console.log(`[ShadowWire] Supported tokens: ${SUPPORTED_TOKENS.length}`);
    return shadowWireClient;
  } catch (error) {
    console.error("[ShadowWire] ✗ Failed to initialize ShadowWire client:", error);
    // Don't set client, allow retry after delay
    return null;
  }
}

function isTokenSupported(token: string): token is SupportedToken {
  return SUPPORTED_TOKENS.includes(token as SupportedToken);
}

export interface ShadowWireTransferParams {
  senderAddress: string;
  recipientAddress: string;
  amount: number;
  token: string;
  type: "internal" | "external";
}

export interface ShadowWireBalance {
  available: number;
  poolAddress: string;
  token: string;
}

export interface SignMessageFn {
  (message: Uint8Array): Promise<Uint8Array>;
}

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
    tokenCount: SUPPORTED_TOKENS.length
  };
}

/**
 * Prepare a ShadowWire transfer (quote/preview)
 * 
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
    // Validate token first
    if (!isTokenSupported(params.token)) {
      return {
        success: false,
        message: `Token "${params.token}" is not supported. Supported tokens: ${SUPPORTED_TOKENS.join(", ")}`,
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false
      };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return {
        success: false,
        message: "ShadowWire SDK not available - install @radr/shadowwire",
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false
      };
    }

    console.log(`[ShadowWire] Preparing ${params.type} transfer: ${params.amount} ${params.token}`);

    const isInternal = params.type === "internal";

    // Get fee info from SDK
    const feePercentage = client.getFeePercentage(params.token);
    const minimumAmount = client.getMinimumAmount(params.token);

    // Validate minimum amount
    if (params.amount < minimumAmount) {
      return {
        success: false,
        message: `Amount must be at least ${minimumAmount} ${params.token}`,
        amountHidden: false,
        senderAnonymous: false,
        requiresWalletSignature: false,
        feePercentage,
        minimumAmount
      };
    }

    // Calculate fees
    const feeCosts = client.calculateFee(params.amount, params.token);

    // Internal: amount hidden, sender NOT anonymous (recipient knows who sent)
    // External: amount visible, sender IS anonymous
    const amountHidden = isInternal;
    const senderAnonymous = !isInternal;

    console.log(`[ShadowWire] Transfer type: ${params.type}, amountHidden: ${amountHidden}, senderAnonymous: ${senderAnonymous}, Fee: ${feePercentage}%`);

    return {
      success: true,
      message: `Ready to transfer ${params.amount} ${params.token} via ShadowWire${amountHidden ? ' (amount hidden)' : ''}${senderAnonymous ? ' (sender anonymous)' : ''}. Fee: ${feeCosts.totalFee} ${params.token}. Wallet signature required.`,
      amountHidden,
      senderAnonymous,
      requiresWalletSignature: true,
      feePercentage,
      minimumAmount,
      transferParams: {
        sender: params.senderAddress,
        recipient: params.recipientAddress,
        amount: params.amount,
        token: params.token,
        type: params.type,
        fee: feeCosts
      }
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing transfer:", error);
    return {
      success: false,
      message: error.message || "Failed to prepare ShadowWire transfer",
      amountHidden: false,
      senderAnonymous: false,
      requiresWalletSignature: false
    };
  }
}

/**
 * Execute a ShadowWire transfer with wallet signature
 * 
 * Requires signMessage function from wallet adapter
 */
export async function executeShadowWireTransfer(
  params: ShadowWireTransferParams,
  signMessage: SignMessageFn
): Promise<{
  success: boolean;
  message: string;
  signature?: string;
  txHash?: string;
}> {
  try {
    // Validate token first
    if (!isTokenSupported(params.token)) {
      return {
        success: false,
        message: `Token "${params.token}" is not supported.`
      };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return {
        success: false,
        message: "ShadowWire SDK not available"
      };
    }

    console.log(`[ShadowWire] Executing ${params.type} transfer: ${params.amount} ${params.token}`);

    // Execute transfer via SDK with wallet signature
    const result = await client.transfer({
      sender: params.senderAddress,
      recipient: params.recipientAddress,
      amount: params.amount,
      token: params.token,
      type: params.type,
      wallet: { signMessage }
    });

    console.log("[ShadowWire] Transfer executed successfully:", result?.signature || result?.txHash);

    return {
      success: true,
      message: `Successfully transferred ${params.amount} ${params.token}`,
      signature: result?.signature,
      txHash: result?.txHash
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing transfer:", error);
    return {
      success: false,
      message: error.message || "Failed to execute ShadowWire transfer"
    };
  }
}

export async function getShadowWireBalance(walletAddress: string, token: string = "SOL"): Promise<ShadowWireBalance | null> {
  try {
    // Validate token
    if (!isTokenSupported(token)) {
      console.log(`[ShadowWire] Token "${token}" not supported for balance check`);
      return null;
    }

    const client = await getShadowWireClient();
    if (!client) {
      console.log("[ShadowWire] Client not available for balance check");
      return null;
    }

    console.log(`[ShadowWire] Getting balance for ${walletAddress.slice(0, 8)}... (${token})`);

    // Use real SDK getBalance method
    const balance = await client.getBalance(walletAddress, token);

    console.log(`[ShadowWire] Balance retrieved: ${balance?.available || 0} ${token}`);

    return {
      available: balance?.available || 0,
      poolAddress: balance?.pool_address || "",
      token
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error getting balance:", error);
    return null;
  }
}

/**
 * Prepare a deposit request (quote/preview)
 * 
 * Use executeShadowWireDeposit() to actually execute with wallet
 */
export async function prepareShadowWireDeposit(walletAddress: string, amount: number, token: string = "SOL"): Promise<{
  success: boolean;
  message: string;
  depositRequest?: {
    wallet: string;
    amount: number;
    token: string;
  };
  feeInfo?: any;
}> {
  try {
    // Validate token
    if (!isTokenSupported(token)) {
      return { 
        success: false, 
        message: `Token "${token}" is not supported. Supported tokens: ${SUPPORTED_TOKENS.join(", ")}` 
      };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return { success: false, message: "ShadowWire SDK not available - install @radr/shadowwire" };
    }

    console.log(`[ShadowWire] Preparing deposit: ${amount} ${token} for ${walletAddress.slice(0, 8)}...`);

    // Import TokenUtils from SDK
    const { TokenUtils } = await import("@radr/shadowwire");
    const amountLamports = TokenUtils.toSmallestUnit(amount, token as any);

    // Get fee information
    const feePercentage = client.getFeePercentage(token);
    const minimumAmount = client.getMinimumAmount(token);
    const feeCosts = client.calculateFee(amount, token);

    if (amount < minimumAmount) {
      return {
        success: false,
        message: `Amount must be at least ${minimumAmount} ${token}`
      };
    }

    console.log(`[ShadowWire] Deposit prepared: ${amountLamports} smallest units, Fee: ${feeCosts.totalFee} ${token}`);

    return {
      success: true,
      message: `Ready to deposit ${amount} ${token} to ShadowWire pool. Fee: ${feeCosts.totalFee} ${token}. Sign transaction to complete.`,
      depositRequest: {
        wallet: walletAddress,
        amount: amountLamports,
        token
      },
      feeInfo: {
        percentage: feePercentage,
        minimum: minimumAmount,
        costs: feeCosts
      }
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing deposit:", error);
    return { success: false, message: error.message || "Failed to prepare deposit" };
  }
}

/**
 * Execute a deposit with wallet
 */
export async function executeShadowWireDeposit(
  walletAddress: string,
  amount: number,
  token: string,
  signMessage: SignMessageFn
): Promise<{
  success: boolean;
  message: string;
  txHash?: string;
}> {
  try {
    if (!isTokenSupported(token)) {
      return { success: false, message: `Token "${token}" is not supported.` };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return { success: false, message: "ShadowWire SDK not available" };
    }

    console.log(`[ShadowWire] Executing deposit: ${amount} ${token}`);

    const { TokenUtils } = await import("@radr/shadowwire");
    const amountLamports = TokenUtils.toSmallestUnit(amount, token as any);

    const result = await client.deposit({
      wallet: { address: walletAddress, signMessage },
      amount: amountLamports,
      token
    });

    console.log("[ShadowWire] Deposit executed:", result?.txHash);

    return {
      success: true,
      message: `Successfully deposited ${amount} ${token}`,
      txHash: result?.txHash
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing deposit:", error);
    return { success: false, message: error.message || "Failed to execute deposit" };
  }
}

/**
 * Prepare a withdrawal request (quote/preview)
 * 
 * Use executeShadowWireWithdraw() to actually execute with wallet
 */
export async function prepareShadowWireWithdraw(walletAddress: string, amount: number, token: string = "SOL"): Promise<{
  success: boolean;
  message: string;
  withdrawRequest?: {
    wallet: string;
    amount: number;
    token: string;
  };
  feeInfo?: any;
}> {
  try {
    // Validate token
    if (!isTokenSupported(token)) {
      return { 
        success: false, 
        message: `Token "${token}" is not supported. Supported tokens: ${SUPPORTED_TOKENS.join(", ")}` 
      };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return { success: false, message: "ShadowWire SDK not available - install @radr/shadowwire" };
    }

    console.log(`[ShadowWire] Preparing withdrawal: ${amount} ${token} for ${walletAddress.slice(0, 8)}...`);

    // Import TokenUtils from SDK
    const { TokenUtils } = await import("@radr/shadowwire");
    const amountLamports = TokenUtils.toSmallestUnit(amount, token as any);

    // Get fee information
    const feePercentage = client.getFeePercentage(token);
    const minimumAmount = client.getMinimumAmount(token);
    const feeCosts = client.calculateFee(amount, token);

    if (amount < minimumAmount) {
      return {
        success: false,
        message: `Amount must be at least ${minimumAmount} ${token}`
      };
    }

    console.log(`[ShadowWire] Withdrawal prepared: ${amountLamports} smallest units, Fee: ${feeCosts.totalFee} ${token}`);

    return {
      success: true,
      message: `Ready to withdraw ${amount} ${token} from ShadowWire pool. Fee: ${feeCosts.totalFee} ${token}. Sign transaction to complete.`,
      withdrawRequest: {
        wallet: walletAddress,
        amount: amountLamports,
        token
      },
      feeInfo: {
        percentage: feePercentage,
        minimum: minimumAmount,
        costs: feeCosts
      }
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error preparing withdrawal:", error);
    return { success: false, message: error.message || "Failed to prepare withdrawal" };
  }
}

/**
 * Execute a withdrawal with wallet
 */
export async function executeShadowWireWithdraw(
  walletAddress: string,
  amount: number,
  token: string,
  signMessage: SignMessageFn
): Promise<{
  success: boolean;
  message: string;
  txHash?: string;
}> {
  try {
    if (!isTokenSupported(token)) {
      return { success: false, message: `Token "${token}" is not supported.` };
    }

    const client = await getShadowWireClient();
    if (!client) {
      return { success: false, message: "ShadowWire SDK not available" };
    }

    console.log(`[ShadowWire] Executing withdrawal: ${amount} ${token}`);

    const { TokenUtils } = await import("@radr/shadowwire");
    const amountLamports = TokenUtils.toSmallestUnit(amount, token as any);

    const result = await client.withdraw({
      wallet: { address: walletAddress, signMessage },
      amount: amountLamports,
      token
    });

    console.log("[ShadowWire] Withdrawal executed:", result?.txHash);

    return {
      success: true,
      message: `Successfully withdrew ${amount} ${token}`,
      txHash: result?.txHash
    };
  } catch (error: any) {
    console.error("[ShadowWire] Error executing withdrawal:", error);
    return { success: false, message: error.message || "Failed to execute withdrawal" };
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
      withdraw: "/api/privacy/shadowwire/withdraw"
    }
  };
}
