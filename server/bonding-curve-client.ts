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

const PROGRAM_ID = new PublicKey(process.env.BONDING_CURVE_PROGRAM_ID || "6WSsUceUttSpcy8P5ofy5cYDG6pyYLWRz3XTnx95EJWh");
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
  uri: string
): Promise<{ transaction: string; mint: string; mintKeypair: Keypair }> {
  const connection = getConnection();
  const mintKeypair = Keypair.generate();
  const mint = mintKeypair.publicKey;

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

export { PROGRAM_ID, FEE_RECIPIENT };
