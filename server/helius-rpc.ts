import { Connection } from "@solana/web3.js";

const NETWORK = process.env.SOLANA_NETWORK || "devnet";

function getHeliusApiKey(): string | undefined {
  return process.env.HELIUS_API_KEY;
}

export function getHeliusRpcUrl(): string {
  const apiKey = getHeliusApiKey();
  if (apiKey && apiKey.length > 0) {
    console.log(`[Helius] Using Helius RPC with key: ${apiKey.substring(0, 8)}...`);
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
  const NETWORK = process.env.SOLANA_NETWORK || "devnet";
  return new Connection(`https://api.${NETWORK}.solana.com`, "confirmed");
}
