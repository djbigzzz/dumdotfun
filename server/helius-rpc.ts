import { Connection } from "@solana/web3.js";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const NETWORK = process.env.SOLANA_NETWORK || "devnet";

export function getHeliusRpcUrl(): string {
  if (HELIUS_API_KEY) {
    return `https://${NETWORK}.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
  }
  return `https://api.${NETWORK}.solana.com`;
}

export function getRpcProvider(): string {
  return HELIUS_API_KEY ? "Helius" : "Public RPC";
}

export function isHeliusConfigured(): boolean {
  return !!HELIUS_API_KEY;
}

let _connection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(getHeliusRpcUrl(), "confirmed");
  }
  return _connection;
}

export function createNewConnection(): Connection {
  return new Connection(getHeliusRpcUrl(), "confirmed");
}
