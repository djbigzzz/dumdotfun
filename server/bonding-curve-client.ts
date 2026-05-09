import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  Keypair,
  SYSVAR_RENT_PUBKEY,
  LAMPORTS_PER_SOL,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import BN from "bn.js";
import { getConnection as getHeliusConnection } from "./helius-rpc";

const _programIdStr = process.env.BONDING_CURVE_PROGRAM_ID;
if (!_programIdStr) {
  throw new Error(
    "BONDING_CURVE_PROGRAM_ID environment variable is required. " +
    "Refusing to fall back to the devnet address to prevent mainnet misconfiguration."
  );
}
const PROGRAM_ID = new PublicKey(_programIdStr);
const FEE_RECIPIENT = new PublicKey(process.env.FEE_RECIPIENT_WALLET || "G6Miqs4m2maHwj91YBCboEwY5NoasLVwL3woVXh2gXjM");

export function getConnection(): Connection {
  return getHeliusConnection();
}

export function getPlatformConfigPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("platform_config")],
    PROGRAM_ID
  );
}

export function getBondingCurvePDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("bonding_curve"), mint.toBuffer()],
    PROGRAM_ID
  );
}

export function getCurveVaultPDA(mint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("curve_vault"), mint.toBuffer()],
    PROGRAM_ID
  );
}

function encodeString(str: string): Buffer {
  const bytes = Buffer.from(str, "utf8");
  const len = Buffer.alloc(4);
  len.writeUInt32LE(bytes.length, 0);
  return Buffer.concat([len, bytes]);
}

function encodeU64(value: number | BN): Buffer {
  const bn = BN.isBN(value) ? value : new BN(value);
  return bn.toArrayLike(Buffer, "le", 8);
}

export async function buildInitializePlatformTransaction(
  authority: PublicKey
): Promise<{ transaction: string; platformConfig: string }> {
  const connection = getConnection();
  const [platformConfig] = getPlatformConfigPDA();

  const discriminator = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

  const data = discriminator;

  const keys = [
    { pubkey: authority, isSigner: true, isWritable: true },
    { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: false },
    { pubkey: platformConfig, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority;

  return {
    transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    platformConfig: platformConfig.toBase58(),
  };
}

export async function buildCreateTokenTransaction(
  creator: PublicKey,
  name: string,
  symbol: string,
  uri: string,
  // Optional: caller may pass an already-grinded mint keypair so the URI
  // baked into the on-chain instruction can be derived from the SAME mint
  // that ends up deployed. Without this, two back-to-back calls each grab
  // a fresh vanity mint from the pool and the URI/mint diverge.
  presetMintKeypair?: Keypair
): Promise<{ transaction: string; mint: string; mintKeypair: Keypair }> {
  const connection = getConnection();
  let mintKeypair: Keypair;
  let vanity = false;
  let suffix: string | null | undefined;
  if (presetMintKeypair) {
    mintKeypair = presetMintKeypair;
  } else {
    const { getVanityMintKeypair } = await import("./vanity-pool");
    const picked = await getVanityMintKeypair(connection);
    mintKeypair = picked.keypair;
    vanity = picked.vanity;
    suffix = picked.suffix;
  }
  const mint = mintKeypair.publicKey;
  if (vanity) {
    console.log(`[create-token] using vanity mint ${mint.toBase58()} (suffix: ${suffix})`);
  }

  const [bondingCurve] = getBondingCurvePDA(mint);
  const [curveSolVault] = getCurveVaultPDA(mint);

  const discriminator = Buffer.from([84, 52, 204, 228, 24, 140, 234, 75]);

  const data = Buffer.concat([
    discriminator,
    encodeString(name),
    encodeString(symbol),
    encodeString(uri),
  ]);

  const keys = [
    { pubkey: creator, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: true, isWritable: true },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveSolVault, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = creator;
  transaction.partialSign(mintKeypair);

  return {
    transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    mint: mint.toBase58(),
    mintKeypair,
  };
}

export async function buildBuyTransaction(
  buyer: PublicKey,
  mint: PublicKey,
  solAmount: number,
  minTokensOut: number = 0
): Promise<{ transaction: string }> {
  const connection = getConnection();

  const [bondingCurve] = getBondingCurvePDA(mint);
  const [curveSolVault] = getCurveVaultPDA(mint);
  const [platformConfig] = getPlatformConfigPDA();
  const buyerTokenAccount = await getAssociatedTokenAddress(mint, buyer);

  const lamports = Math.floor(solAmount * LAMPORTS_PER_SOL);
  const minTokens = Math.floor(minTokensOut * 1_000_000);

  const discriminator = Buffer.from([102, 6, 61, 18, 1, 218, 235, 234]);

  const data = Buffer.concat([
    discriminator,
    encodeU64(lamports),
    encodeU64(minTokens),
  ]);

  const keys = [
    { pubkey: buyer, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveSolVault, isSigner: false, isWritable: true },
    { pubkey: platformConfig, isSigner: false, isWritable: true },
    { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
    { pubkey: buyerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = buyer;

  return {
    transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
  };
}

export async function buildSellTransaction(
  seller: PublicKey,
  mint: PublicKey,
  tokenAmount: number,
  minSolOut: number = 0
): Promise<{ transaction: string }> {
  const connection = getConnection();

  const [bondingCurve] = getBondingCurvePDA(mint);
  const [curveSolVault] = getCurveVaultPDA(mint);
  const [platformConfig] = getPlatformConfigPDA();
  const sellerTokenAccount = await getAssociatedTokenAddress(mint, seller);

  const tokens = Math.floor(tokenAmount * 1_000_000);
  const minLamports = Math.floor(minSolOut * LAMPORTS_PER_SOL);

  const discriminator = Buffer.from([51, 230, 133, 164, 1, 127, 131, 173]);

  const data = Buffer.concat([
    discriminator,
    encodeU64(tokens),
    encodeU64(minLamports),
  ]);

  const keys = [
    { pubkey: seller, isSigner: true, isWritable: true },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveSolVault, isSigner: false, isWritable: true },
    { pubkey: platformConfig, isSigner: false, isWritable: true },
    { pubkey: FEE_RECIPIENT, isSigner: false, isWritable: true },
    { pubkey: sellerTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = seller;

  return {
    transaction: transaction.serialize({ requireAllSignatures: false }).toString("base64"),
  };
}

export function calculateBuyQuote(
  solAmount: number,
  virtualSolReserves: number,
  virtualTokenReserves: number
): number {
  const lamports = solAmount * LAMPORTS_PER_SOL;
  const fee = Math.floor(lamports * 0.01);
  const solAfterFee = lamports - fee;

  const k = BigInt(Math.floor(virtualSolReserves)) * BigInt(Math.floor(virtualTokenReserves));
  const newSolReserves = BigInt(Math.floor(virtualSolReserves)) + BigInt(Math.floor(solAfterFee));
  const newTokenReserves = k / newSolReserves;
  const tokensOut = BigInt(Math.floor(virtualTokenReserves)) - newTokenReserves;

  return Number(tokensOut) / 1_000_000;
}

export function calculateSellQuote(
  tokenAmount: number,
  virtualSolReserves: number,
  virtualTokenReserves: number
): number {
  const tokens = tokenAmount * 1_000_000;

  const k = BigInt(Math.floor(virtualSolReserves)) * BigInt(Math.floor(virtualTokenReserves));
  const newTokenReserves = BigInt(Math.floor(virtualTokenReserves)) + BigInt(Math.floor(tokens));
  const newSolReserves = k / newTokenReserves;
  const solOut = BigInt(Math.floor(virtualSolReserves)) - newSolReserves;

  const fee = Number(solOut) * 0.01;
  const solAfterFee = Number(solOut) - fee;

  return solAfterFee / LAMPORTS_PER_SOL;
}

export function calculatePrice(
  virtualSolReserves: number,
  virtualTokenReserves: number
): number {
  return (virtualSolReserves / LAMPORTS_PER_SOL) / (virtualTokenReserves / 1_000_000);
}

export async function checkPlatformInitialized(): Promise<boolean> {
  try {
    const connection = getConnection();
    const [platformConfig] = getPlatformConfigPDA();
    const accountInfo = await connection.getAccountInfo(platformConfig);
    return accountInfo !== null;
  } catch {
    return false;
  }
}

export async function fetchBondingCurveData(mint: PublicKey): Promise<{
  virtualSolReserves: number;
  virtualTokenReserves: number;
  realSolReserves: number;
  realTokenReserves: number;
  tokenTotalSupply: number;
  isGraduated: boolean;
  creator: string;
} | null> {
  try {
    const connection = getConnection();
    const [bondingCurve] = getBondingCurvePDA(mint);
    const accountInfo = await connection.getAccountInfo(bondingCurve);
    
    if (!accountInfo) return null;

    const data = accountInfo.data;
    const offset = 8;

    const mintPubkey = new PublicKey(data.slice(offset, offset + 32));
    const creator = new PublicKey(data.slice(offset + 32, offset + 64));
    const virtualSolReserves = new BN(data.slice(offset + 64, offset + 72), "le").toNumber();
    const virtualTokenReserves = new BN(data.slice(offset + 72, offset + 80), "le").toNumber();
    const realSolReserves = new BN(data.slice(offset + 80, offset + 88), "le").toNumber();
    const realTokenReserves = new BN(data.slice(offset + 88, offset + 96), "le").toNumber();
    const tokenTotalSupply = new BN(data.slice(offset + 96, offset + 104), "le").toNumber();
    const isGraduated = data[offset + 104] === 1;

    return {
      virtualSolReserves,
      virtualTokenReserves,
      realSolReserves,
      realTokenReserves,
      tokenTotalSupply,
      isGraduated,
      creator: creator.toBase58(),
    };
  } catch (error) {
    console.error("Error fetching bonding curve data:", error);
    return null;
  }
}

export async function buildWithdrawLiquidityTransaction(
  authority: PublicKey,
  mint: PublicKey,
  destination: PublicKey,
): Promise<{ transaction: Transaction }> {
  const connection = getConnection();

  const [bondingCurve] = getBondingCurvePDA(mint);
  const [curveSolVault] = getCurveVaultPDA(mint);
  const [platformConfig] = getPlatformConfigPDA();
  const destinationTokenAccount = await getAssociatedTokenAddress(mint, destination);

  const discriminator = Buffer.from([149, 158, 33, 185, 47, 243, 253, 31]);

  const data = discriminator;

  const keys = [
    { pubkey: authority, isSigner: true, isWritable: false },
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: bondingCurve, isSigner: false, isWritable: true },
    { pubkey: curveSolVault, isSigner: false, isWritable: true },
    { pubkey: platformConfig, isSigner: false, isWritable: false },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: destinationTokenAccount, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
  ];

  const instruction = new TransactionInstruction({
    keys,
    programId: PROGRAM_ID,
    data,
  });

  const transaction = new Transaction().add(instruction);
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = authority;

  return { transaction };
}

export async function sendWithdrawLiquidity(
  authorityKeypair: Keypair,
  mintAddress: string,
  destinationKeypair: Keypair,
): Promise<{ txSignature: string; solWithdrawn: number; tokensWithdrawn: number }> {
  const connection = getConnection();
  const mint = new PublicKey(mintAddress);

  const curveData = await fetchBondingCurveData(mint);
  if (!curveData) {
    throw new Error("Bonding curve not found for mint: " + mintAddress);
  }
  if (!curveData.isGraduated) {
    throw new Error("Token has not graduated yet - cannot withdraw liquidity");
  }
  if (curveData.realSolReserves === 0 && curveData.realTokenReserves === 0) {
    throw new Error("Liquidity has already been withdrawn");
  }

  const solToWithdraw = curveData.realSolReserves / LAMPORTS_PER_SOL;
  const tokensToWithdraw = curveData.realTokenReserves / 1_000_000;

  console.log(`[WithdrawLiquidity] Withdrawing ${solToWithdraw} SOL + ${tokensToWithdraw} tokens from curve`);

  const { transaction } = await buildWithdrawLiquidityTransaction(
    authorityKeypair.publicKey,
    mint,
    destinationKeypair.publicKey,
  );

  // Refresh blockhash right before signing to maximize valid window.
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  transaction.recentBlockhash = blockhash;
  transaction.lastValidBlockHeight = lastValidBlockHeight;
  transaction.sign(authorityKeypair);

  const txSignature = await connection.sendRawTransaction(transaction.serialize(), {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  // CRITICAL: must verify the tx actually succeeded on-chain.
  // confirmTransaction returns even when the tx landed but reverted, so we
  // must inspect value.err. Fund-loss bug class: if we treat a reverted
  // withdraw as success, downstream pool creation will use stale snapshot
  // amounts and may misreport state.
  const confirmation = await connection.confirmTransaction(
    { signature: txSignature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  if (confirmation.value.err) {
    const errStr = JSON.stringify(confirmation.value.err);
    throw new Error(`withdraw_liquidity tx ${txSignature} reverted on-chain: ${errStr}`);
  }

  // Verify post-state: bonding curve real reserves should now be zero.
  const postCurve = await fetchBondingCurveData(mint);
  if (!postCurve) {
    throw new Error(`Could not re-fetch bonding curve after withdraw tx ${txSignature}`);
  }
  if (postCurve.realSolReserves !== 0 || postCurve.realTokenReserves !== 0) {
    throw new Error(
      `withdraw_liquidity tx ${txSignature} confirmed but curve reserves are non-zero: ` +
      `${postCurve.realSolReserves} lamports SOL, ${postCurve.realTokenReserves} token units. ` +
      `Refusing to proceed with stale state.`,
    );
  }

  console.log(`[WithdrawLiquidity] Success! TX: ${txSignature}`);
  console.log(`[WithdrawLiquidity] SOL: ${solToWithdraw}, Tokens: ${tokensToWithdraw}`);

  return {
    txSignature,
    solWithdrawn: solToWithdraw,
    tokensWithdrawn: tokensToWithdraw,
  };
}

export { PROGRAM_ID, FEE_RECIPIENT };
