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

// Fetch tokens using Helius API with simple balance checking
export async function getTokensFromHeliusDAS(): Promise<Token[]> {
  const apiKey = process.env.HELIUS_API_KEY;
  
  if (!apiKey) {
    console.log("Helius API key not set (set HELIUS_API_KEY env var)");
    return [];
  }

  try {
    console.log("Fetching tokens from Helius RPC...");
    
    // Use Helius RPC to get recent transaction signatures and find token mints
    const response = await fetch(
      `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getSignaturesForAddress",
          params: [
            "6EF8rRecthR5Dkzon8Nrg6oL64f9sqooGH3L5C5rq7j", // Pump.fun program
            { limit: 10 }
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
      console.log("No transactions found from Helius");
      return [];
    }

    // Create mock tokens from the transaction data
    // In production, you'd parse the actual transactions
    const tokens: Token[] = data.result.slice(0, 12).map((tx: any, idx: number) => ({
      mint: tx.signature?.slice(0, 44) || `token-${idx}`,
      name: `Token ${idx + 1}`,
      symbol: "NEW",
      imageUri: null,
      bondingCurveProgress: Math.random() * 50,
      marketCapSol: Math.random() * 100,
      priceInSol: Math.random() * 0.01,
      creatorAddress: "helius",
      createdAt: new Date(tx.blockTime ? tx.blockTime * 1000 : Date.now()).toISOString(),
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

// Placeholder for direct RPC queries
export async function getTokensFromOnChain(): Promise<Token[]> {
  return [];
}
