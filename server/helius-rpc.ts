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

let _loggedProvider = false;

export function getHeliusRpcUrl(): string {
  const apiKey = getHeliusApiKey();
  if (apiKey && apiKey.length > 0) {
    if (!_loggedProvider) {
      console.log(`[Helius] Using Helius RPC`);
      _loggedProvider = true;
    }
    return `https://${NETWORK}.helius-rpc.com/?api-key=${apiKey}`;
  }
  if (!_loggedProvider) {
    console.log("[Helius] No API key found, using public RPC");
    _loggedProvider = true;
  }
  return `https://api.${NETWORK}.solana.com`;
}

export function getRpcProvider(): string {
  return getHeliusApiKey() ? "Helius" : "Public RPC";
}

export function isHeliusConfigured(): boolean {
  return !!getHeliusApiKey();
}

let _connection: Connection | null = null;
let _publicConnection: Connection | null = null;

export function getConnection(): Connection {
  if (!_connection) {
    _connection = new Connection(getHeliusRpcUrl(), "confirmed");
  }
  return _connection;
}

export function createNewConnection(): Connection {
  return new Connection(getHeliusRpcUrl(), "confirmed");
}

export function getPublicConnection(): Connection {
  if (!_publicConnection) {
    _publicConnection = new Connection(`https://api.${NETWORK}.solana.com`, "confirmed");
  }
  return _publicConnection;
}
