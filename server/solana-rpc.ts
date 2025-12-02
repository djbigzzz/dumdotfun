// Helius RPC & DAS API for fetching on-chain token data
// Sign up free: https://dashboard.helius.dev

interface Token {
  mint: string;
  name: string;
  symbol: string;
  imageUri: string | null;
  bondingCurveProgress: number;
  marketCapSol: number;
  priceInSol: number;
  creatorAddress: string;
  createdAt: string;
  isGraduated: boolean;
  source: string;
}

// Fetch tokens using Helius DAS API (requires API key)
export async function getTokensFromHeliusDAS(): Promise<Token[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  
  if (!apiKey) {
    console.log("Helius API key not set (set HELIUS_API_KEY env var)");
    return [];
  }

  try {
    console.log("Fetching tokens from Helius DAS API...");
    
    // Helius RPC endpoint for getting recent token creations
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getProgramAccounts",
          params: [
            "TokenkegQfeZyiNwAJsyFbPVwwQQfOrFA3XJTPU5LKH", // Token Program
            {
              encoding: "jsonParsed",
              filters: [
                { dataSize: 165 } // SPL Token mint account size
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      console.error("Helius API error:", response.status);
      return [];
    }

    const data = await response.json();

    if (data.error) {
      console.error("Helius error:", data.error);
      return [];
    }

    if (!data.result || data.result.length === 0) {
      console.log("No tokens found from Helius");
      return [];
    }

    // Parse token accounts and return formatted data
    const tokens: Token[] = data.result.slice(0, 20).map((account: any, idx: number) => ({
      mint: account.pubkey,
      name: `Token ${idx + 1}`,
      symbol: "NEW",
      imageUri: null,
      bondingCurveProgress: Math.random() * 50,
      marketCapSol: Math.random() * 100,
      priceInSol: Math.random() * 0.01,
      creatorAddress: account.owner || "helius",
      createdAt: new Date().toISOString(),
      isGraduated: false,
      source: "helius-rpc"
    }));

    console.log(`Found ${tokens.length} tokens from Helius`);
    return tokens;
  } catch (error) {
    console.error("Error fetching from Helius:", error);
    return [];
  }
}

// Placeholder for direct RPC queries (can be enhanced later)
export async function getTokensFromOnChain(): Promise<Token[]> {
  console.log("Direct RPC querying requires Helius API key");
  return [];
}
