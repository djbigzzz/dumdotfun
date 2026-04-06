import { Connection } from "@solana/web3.js";

function getNetwork(): string {
  const network = process.env.SOLANA_NETWORK;
  if (!network) {
    throw new Error(
      "SOLANA_NETWORK environment variable must be explicitly set (e.g., 'devnet' or 'mainnet-beta'). " +
      "Refusing to default to devnet to prevent accidental mainnet misconfiguration."
    );
  }
  return network;
}

const NETWORK = getNetwork();

function getHeliusApiKey(): string | undefined {
  return process.env.HELIUS_API_KEY;
}

export function getHeliusRpcUrl(): string {
  const apiKey = getHeliusApiKey();
  if (apiKey && apiKey.length > 0) {
    console.log(`[Helius] Using Helius RPC`);
    return `https://${NETWORK}.helius-rpc.com/?api-key=${apiKey}`;
  }
  console.log("[Helius] No API key found, using public RPC");
  return `https://api.${NETWORK}.solana.com`;
}

export function getRpcProvider(): string {
  return getHeliusApiKey() ? "Helius" : "Public RPC";
}

export function isHeliusConfigured(): boolean {
  return !!getHeliusApiKey();
}

export function getConnection(): Connection {
  return new Connection(getHeliusRpcUrl(), "confirmed");
}

export function createNewConnection(): Connection {
  return new Connection(getHeliusRpcUrl(), "confirmed");
}

export function getPublicConnection(): Connection {
  return new Connection(`https://api.${NETWORK}.solana.com`, "confirmed");
}
