import { 
  Connection, 
  Keypair, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  getMinimumBalanceForRentExemptMint,
} from "@solana/spl-token";
import { PLATFORM_FEES, getFeeRecipientWallet } from "./fees";

const DEVNET_RPC = "https://api.devnet.solana.com";

interface CreateTokenParams {
  creatorAddress: string;
  name: string;
  symbol: string;
  uri: string;
  decimals?: number;
  initialSupply?: number;
}

interface CreateTokenResult {
  success: boolean;
  transaction?: string;
  mint?: string;
  error?: string;
}

export async function buildDevnetTokenTransaction(
  params: CreateTokenParams
): Promise<CreateTokenResult> {
  try {
    const connection = new Connection(DEVNET_RPC, "confirmed");
    const creator = new PublicKey(params.creatorAddress);
    const mintKeypair = Keypair.generate();
    const mint = mintKeypair.publicKey;
    const decimals = params.decimals ?? 9;
    const initialSupply = params.initialSupply ?? 1_000_000_000;

    console.log("[Devnet Token] Building transaction for:", {
      creator: creator.toBase58(),
      mint: mint.toBase58(),
      name: params.name,
      symbol: params.symbol,
    });

    const transaction = new Transaction();

    // Add platform fee transfer as FIRST instruction
    // Use exact lamport value to avoid floating point precision issues
    // 0.05 SOL = 50,000,000 lamports
    const FEE_LAMPORTS = 50_000_000; // Exactly 0.05 SOL
    try {
      const feeRecipient = getFeeRecipientWallet();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: creator,
          toPubkey: feeRecipient,
          lamports: FEE_LAMPORTS,
        })
      );
      console.log(`[Devnet Token] Fee transfer added: ${FEE_LAMPORTS / LAMPORTS_PER_SOL} SOL (${FEE_LAMPORTS} lamports) to ${feeRecipient.toBase58()}`);
    } catch (feeError) {
      console.error("[Devnet Token] Failed to add fee transfer:", feeError);
      // Continue without fee if FEE_RECIPIENT_WALLET not set
    }

    const rentExemptBalance = await getMinimumBalanceForRentExemptMint(connection);
    transaction.add(
      SystemProgram.createAccount({
        fromPubkey: creator,
        newAccountPubkey: mint,
        space: MINT_SIZE,
        lamports: rentExemptBalance,
        programId: TOKEN_PROGRAM_ID,
      })
    );

    transaction.add(
      createInitializeMintInstruction(
        mint,
        decimals,
        creator,
        creator,
        TOKEN_PROGRAM_ID
      )
    );

    const creatorATA = await getAssociatedTokenAddress(mint, creator);
    transaction.add(
      createAssociatedTokenAccountInstruction(
        creator,
        creatorATA,
        creator,
        mint
      )
    );

    const supplyWithDecimals = BigInt(initialSupply) * BigInt(10 ** decimals);
    transaction.add(
      createMintToInstruction(
        mint,
        creatorATA,
        creator,
        supplyWithDecimals
      )
    );

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    transaction.feePayer = creator;

    transaction.partialSign(mintKeypair);

    const serialized = transaction.serialize({ 
      requireAllSignatures: false,
      verifySignatures: false,
    });

    console.log("[Devnet Token] Transaction built successfully, mint:", mint.toBase58());

    return {
      success: true,
      transaction: serialized.toString("base64"),
      mint: mint.toBase58(),
    };
  } catch (error: any) {
    console.error("[Devnet Token] Error building transaction:", error);
    return {
      success: false,
      error: error.message || "Failed to build token transaction",
    };
  }
}

export async function getDevnetBalance(address: string): Promise<number> {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const pubkey = new PublicKey(address);
    const balance = await connection.getBalance(pubkey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("[Devnet] Error getting balance:", error);
    return 0;
  }
}

export async function requestDevnetAirdrop(address: string): Promise<{ success: boolean; signature?: string; error?: string }> {
  try {
    const connection = new Connection("https://api.devnet.solana.com", "confirmed");
    const pubkey = new PublicKey(address);
    
    const signature = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(signature, "confirmed");
    
    console.log("[Devnet] Airdrop successful:", signature);
    return { success: true, signature };
  } catch (error: any) {
    console.error("[Devnet] Airdrop failed:", error);
    return { success: false, error: error.message };
  }
}
