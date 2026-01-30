import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Upload, Zap, Loader2, CheckCircle, ExternalLink, Wallet, RefreshCw, Shield, Lock, Eye } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Buffer } from "buffer";
import { Connection, Transaction } from "@solana/web3.js";

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
}

const SOLANA_RPC = import.meta.env.VITE_SOLANA_RPC_URL || "https://api.devnet.solana.com";

interface CreatedToken {
  id: string;
  mint: string;
  name: string;
  symbol: string;
  signature?: string;
}

export default function CreateToken() {
  const { privateMode } = usePrivacy();
  const { connectedWallet, connectWallet } = useWallet();
  const [formData, setFormData] = useState({
    name: "",
    symbol: "",
    description: "",
    twitter: "",
    telegram: "",
    website: "",
  });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [createdToken, setCreatedToken] = useState<CreatedToken | null>(null);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [creationStep, setCreationStep] = useState<string>("");
  const [enableConfidential, setEnableConfidential] = useState(false);
  const [enableStealth, setEnableStealth] = useState(false);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [showDevBuyStep, setShowDevBuyStep] = useState(false);
  const [devBuyAmount, setDevBuyAmount] = useState<string>("0.2");

  const { data: solPriceData } = useQuery({
    queryKey: ["sol-price"],
    queryFn: async () => {
      const res = await fetch("/api/price/sol");
      if (!res.ok) return { price: 0 };
      return res.json();
    },
    refetchInterval: 30000,
  });
  const solPrice = solPriceData?.price || 0;

  const fetchBalance = async () => {
    if (connectedWallet) {
      setIsLoadingBalance(true);
      try {
        const res = await fetch(`/api/devnet/balance/${connectedWallet}`);
        const data = await res.json();
        setWalletBalance(data.balance);
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      } finally {
        setIsLoadingBalance(false);
      }
    }
  };

  useEffect(() => {
    if (connectedWallet) {
      fetchBalance();
    }
  }, [connectedWallet]);

  const requestAirdrop = async () => {
    if (!connectedWallet) {
      toast.error("Connect wallet first");
      return;
    }
    
    toast.info("Requesting devnet SOL airdrop...");
    try {
      const res = await fetch("/api/devnet/airdrop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: connectedWallet }),
      });
      
      if (res.ok) {
        toast.success("Airdrop received! +1 SOL");
        fetchBalance();
      } else {
        const data = await res.json();
        toast.error(data.error || "Airdrop failed");
      }
    } catch (e) {
      toast.error("Airdrop request failed");
    }
  };

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      if (!connectedWallet) {
        throw new Error("Connect wallet to deploy on devnet");
      }

      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet required for devnet deployment");
      }

      const devBuySol = parseFloat(devBuyAmount);
      if (isNaN(devBuySol) || devBuySol < 0.2) {
        throw new Error("Minimum dev buy is 0.2 SOL");
      }

      setCreationStep("Building token creation transaction...");
      
      const buildRes = await fetch("/api/bonding-curve/create-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creator: connectedWallet,
          name: formData.name,
          symbol: formData.symbol,
          uri: imagePreview || "",
        }),
      });

      if (!buildRes.ok) {
        const error = await buildRes.json();
        if (error.needsInit) {
          throw new Error("Platform not initialized. Contact platform admin to initialize the bonding curve.");
        }
        throw new Error(error.error || "Failed to build transaction");
      }

      const { transaction: txBase64, mint } = await buildRes.json();
      
      setCreationStep("Sign to create token...");
      
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      
      const signedTx = await phantom.signTransaction(transaction);
      
      setCreationStep("Creating token on-chain...");
      
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");
      
      setCreationStep(`Building dev buy (${devBuySol} SOL)...`);
      
      const buyRes = await fetch("/api/bonding-curve/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          buyer: connectedWallet,
          mint: mint,
          solAmount: devBuySol.toString(),
          minTokensOut: "0",
        }),
      });

      if (!buyRes.ok) {
        const error = await buyRes.json();
        throw new Error(error.error || "Failed to build dev buy transaction");
      }

      const { transaction: buyTxBase64 } = await buyRes.json();
      
      setCreationStep(`Sign to buy ${devBuySol} SOL worth of tokens...`);
      
      const buyTxBytes = Buffer.from(buyTxBase64, "base64");
      const buyTransaction = Transaction.from(buyTxBytes);
      
      const signedBuyTx = await phantom.signTransaction(buyTransaction);
      
      setCreationStep("Executing dev buy...");
      
      const buySignature = await connection.sendRawTransaction(signedBuyTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(buySignature, "confirmed");
      
      setCreationStep("Saving token to database...");
      
      const confirmRes = await fetch("/api/tokens/devnet-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mint,
          name: formData.name,
          symbol: formData.symbol,
          description: formData.description || null,
          imageUri: imagePreview || null,
          creatorAddress: connectedWallet,
          signature,
        }),
      });

      if (!confirmRes.ok) {
        const error = await confirmRes.json();
        throw new Error(error.error || "Failed to confirm token");
      }

      const { token } = await confirmRes.json();
      
      await fetch("/api/bonding-curve/confirm-trade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: connectedWallet,
          tokenMint: mint,
          side: "buy",
          amount: devBuySol,
          signature: buySignature,
        }),
      });
      
      setCreationStep("Token launched with dev buy!");
      
      return { token, signature, buySignature, devBuyAmount: devBuySol };
    },
    onSuccess: (data) => {
      toast.success(`Token ${data.token.name} launched with ${data.devBuyAmount} SOL dev buy!`);
      setCreatedToken({ ...data.token, signature: data.signature });
      setCreationStep("");
      fetchBalance();
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setCreationStep("");
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("File must be smaller than 2MB");
        return;
      }
      
      setFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!connectedWallet) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Name and symbol are required");
      return;
    }

    setShowDevBuyStep(true);
  };

  const handleCreateWithDevBuy = () => {
    const amount = parseFloat(devBuyAmount);
    if (isNaN(amount) || amount < 0.2) {
      toast.error("Minimum dev buy is 0.2 SOL");
      return;
    }
    createTokenMutation.mutate();
    setShowDevBuyStep(false);
  };

  const handleBackToForm = () => {
    setShowDevBuyStep(false);
    setDevBuyAmount("0.2");
  };

  const resetForm = () => {
    setFormData({
      name: "",
      symbol: "",
      description: "",
      twitter: "",
      telegram: "",
      website: "",
    });
    setImagePreview(null);
    setFileName(null);
    setCreatedToken(null);
    setShowDevBuyStep(false);
    setDevBuyAmount("0.2");
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Devnet Banner */}
        <div className={`${privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50 text-[#4ADE80]" : "bg-purple-100 border-black text-purple-800"} border-2 rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}>
          <div className="flex items-center gap-2">
            <Zap className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-purple-700"}`} />
            <p className={`text-sm font-bold ${privateMode ? "font-mono" : ""}`}>
              SOLANA DEVNET - All tokens are deployed on-chain to Solana devnet
            </p>
          </div>
        </div>

        {/* Dev Buy Step Modal */}
        {showDevBuyStep && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          >
            <div className={`${privateMode ? "bg-zinc-900 border-[#4ADE80]" : "bg-zinc-900 border-zinc-700"} border-2 rounded-2xl p-6 max-w-md w-full shadow-2xl`}>
              <h2 className="text-white text-xl font-bold text-center mb-2">
                Choose how many [{formData.symbol || 'tokens'}] you want to buy
              </h2>
              
              <p className="text-zinc-400 text-sm text-center mb-6">
                As the creator, you must buy at least 0.2 SOL worth to protect your coin from snipers
              </p>

              <div className="mb-6">
                <div className="flex items-center justify-end mb-2">
                  <span className="text-zinc-500 text-sm">Switch to {formData.symbol || 'token'}</span>
                </div>
                
                <div className={`${privateMode ? "bg-zinc-800 border-[#4ADE80]/30" : "bg-zinc-800 border-zinc-600"} border rounded-xl p-4 flex items-center justify-between ${parseFloat(devBuyAmount) < 0.2 ? "border-red-500" : ""}`}>
                  <input
                    type="number"
                    value={devBuyAmount}
                    onChange={(e) => setDevBuyAmount(e.target.value)}
                    min="0.2"
                    step="0.1"
                    className="bg-transparent text-white text-2xl font-bold w-full outline-none"
                    placeholder="0.2"
                    data-testid="input-dev-buy-amount"
                  />
                  <div className="flex items-center gap-2 ml-4">
                    <span className="text-white font-bold">SOL</span>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">◎</span>
                    </div>
                  </div>
                </div>
                
                {walletBalance !== null && (
                  <p className="text-zinc-500 text-xs mt-2 text-right">
                    Balance: {walletBalance.toFixed(4)} SOL
                  </p>
                )}
                
                {parseFloat(devBuyAmount) >= 0.2 && (
                  <div className={`mt-4 p-3 rounded-lg ${privateMode ? "bg-[#4ADE80]/10 border border-[#4ADE80]/30" : "bg-zinc-700/50"}`}>
                    <p className="text-zinc-400 text-xs">You will receive approximately:</p>
                    <p className={`text-lg font-bold ${privateMode ? "text-[#4ADE80]" : "text-white"}`}>
                      {((parseFloat(devBuyAmount) / 30) * 800000000).toLocaleString(undefined, {maximumFractionDigits: 0})} {formData.symbol || 'tokens'}
                    </p>
                    <p className="text-zinc-500 text-xs mt-1">
                      {(((parseFloat(devBuyAmount) / 30) * 800000000) / 1000000000 * 100).toFixed(2)}% of total 1B supply
                    </p>
                  </div>
                )}
              </div>

              <button
                onClick={handleCreateWithDevBuy}
                disabled={createTokenMutation.isPending || parseFloat(devBuyAmount) < 0.2}
                className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${
                  privateMode 
                    ? "bg-[#4ADE80] hover:bg-[#4ADE80]/90 text-black" 
                    : "bg-green-400 hover:bg-green-500 text-black"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                data-testid="button-create-with-dev-buy"
              >
                {createTokenMutation.isPending ? "Creating..." : "Create coin"}
              </button>
              
              {parseFloat(devBuyAmount) < 0.2 && (
                <p className="text-red-400 text-xs text-center mt-2">Minimum: 0.2 SOL</p>
              )}

              <button
                onClick={handleBackToForm}
                className="w-full mt-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm transition-colors"
                data-testid="button-back-to-form"
              >
                ← Back to edit
              </button>
            </div>
          </motion.div>
        )}

        {/* Wallet & Balance Section */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50 text-[#4ADE80]" : "bg-white border-black text-gray-900"} border-2 rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]`}
        >
          {connectedWallet ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${privateMode ? "bg-[#4ADE80]/20" : "bg-green-500"}`}>
                    <Wallet className={`w-5 h-5 ${privateMode ? "text-[#4ADE80]" : "text-white"}`} />
                  </div>
                  <div>
                    <p className={`font-bold ${privateMode ? "font-mono" : ""}`}>Wallet Connected</p>
                    <p className={`text-xs font-mono ${privateMode ? "text-[#4ADE80]/60" : "text-gray-500"}`}>
                      {connectedWallet.slice(0, 4)}...{connectedWallet.slice(-4)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`text-xs ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-500"}`}>Devnet Balance</p>
                  <div className="flex items-center gap-2">
                    <p className={`font-bold text-xl ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-900"}`}>
                      {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : '---'}
                    </p>
                    <button
                      type="button"
                      onClick={fetchBalance}
                      disabled={isLoadingBalance}
                      className={`p-1 rounded ${privateMode ? "hover:bg-[#4ADE80]/10" : "hover:bg-gray-100"}`}
                      data-testid="button-refresh-balance"
                    >
                      <RefreshCw className={`w-4 h-4 ${privateMode ? "text-[#4ADE80]" : "text-gray-500"} ${isLoadingBalance ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
              
              {walletBalance !== null && walletBalance < 0.1 && (
                <div className={`flex items-center justify-between p-3 rounded-lg border ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-yellow-50 border-yellow-200"}`}>
                  <p className={`text-sm ${privateMode ? "text-[#4ADE80] font-mono" : "text-yellow-800"}`}>
                    Low balance! You need SOL to deploy tokens.
                  </p>
                  <a
                    href="https://faucet.solana.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-4 py-2 text-sm font-bold border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] transition-colors ${
                      privateMode 
                        ? "bg-black border-[#4ADE80] text-[#4ADE80] hover:bg-[#4ADE80]/10" 
                        : "bg-purple-500 text-white hover:bg-purple-600"
                    }`}
                    data-testid="button-request-airdrop"
                  >
                    Get Free SOL
                  </a>
                </div>
              )}
              
              {walletBalance !== null && walletBalance >= 0.1 && (
                <a
                  href="https://faucet.solana.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`w-full py-2 text-sm font-bold rounded-lg transition-colors text-center block ${
                    privateMode 
                      ? "bg-black border border-[#4ADE80]/30 text-[#4ADE80] hover:bg-[#4ADE80]/10 font-mono" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  data-testid="button-request-airdrop-secondary"
                >
                  Request More Devnet SOL
                </a>
              )}
            </div>
          ) : (
            <div className="text-center py-4">
              <Wallet className={`w-12 h-12 mx-auto mb-3 ${privateMode ? "text-[#4ADE80]/20" : "text-gray-300"}`} />
              <p className={`${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"} mb-3`}>Connect your wallet to deploy tokens on Solana devnet</p>
              <button
                onClick={() => connectWallet()}
                className={`px-6 py-3 font-bold rounded-lg border-2 border-black transition-all ${
                  privateMode 
                    ? "bg-black border-[#4ADE80] text-[#4ADE80] hover:shadow-[0_0_15px_rgba(57,255,20,0.3)] font-mono" 
                    : "bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
                }`}
                data-testid="button-connect-wallet"
              >
                Connect Phantom Wallet
              </button>
            </div>
          )}
        </motion.div>

        <div>
          <h1 className={`text-3xl md:text-4xl font-black ${privateMode ? "text-white font-mono" : "text-gray-900"}`}>
            {privateMode ? "> INITIALIZE_MINT" : "Launch New Token"}
          </h1>
          <p className={`mt-1 ${privateMode ? "text-[#4ADE80] font-mono" : "text-gray-500"}`}>
            {privateMode ? "// BROADCASTING_TO_DEVNET" : "Deploy your token directly to Solana devnet"}
          </p>
        </div>

        {createdToken ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`border-2 border-black rounded-lg p-6 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
              privateMode ? "bg-black border-[#4ADE80]" : "bg-green-50"
            }`}
          >
            <CheckCircle className={`w-16 h-16 mx-auto ${privateMode ? "text-[#4ADE80]" : "text-green-600"}`} />
            <div>
              <h2 className={`text-2xl font-black ${privateMode ? "text-white font-mono" : "text-green-700"}`}>
                {privateMode ? ">> MINT_SUCCESSFULL" : "TOKEN DEPLOYED!"}
              </h2>
              <p className={`text-sm mt-2 ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>
                Your token <span className={`${privateMode ? "text-white" : "text-gray-900"} font-bold`}>{createdToken.name}</span> ({createdToken.symbol}) is now live on Solana devnet!
              </p>
            </div>
            <div className={`border-2 border-black rounded-lg p-3 ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-white"}`}>
              <p className={`text-xs mb-1 font-bold ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-500"}`}>Token Mint Address</p>
              <p className={`font-mono text-sm break-all ${privateMode ? "text-white" : "text-green-600"}`}>{createdToken.mint}</p>
            </div>
            {createdToken.signature && (
              <div className={`border-2 border-black rounded-lg p-3 ${privateMode ? "bg-black border-[#4ADE80]/30" : "bg-white"}`}>
                <p className={`text-xs mb-1 font-bold ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-500"}`}>Transaction Signature</p>
                <a 
                  href={`https://explorer.solana.com/tx/${createdToken.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`font-mono text-sm break-all hover:underline flex items-center justify-center gap-1 ${
                    privateMode ? "text-[#4ADE80]" : "text-blue-600"
                  }`}
                  data-testid="link-transaction"
                >
                  {createdToken.signature.slice(0, 20)}...{createdToken.signature.slice(-20)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <div className={`w-full mb-4 p-4 border-2 rounded-lg ${privateMode ? "bg-black border-[#4ADE80]/30 text-[#4ADE80]" : "bg-white border-black text-gray-900"}`}>
                <p className="text-sm font-bold opacity-70 mb-1 uppercase">Estimated Market Cap</p>
                <p className="text-2xl font-black">{solPrice ? `$${(30 * solPrice).toFixed(2)}` : "$0.00"}</p>
                <p className="text-xs opacity-50 font-mono mt-1">Initial bonding curve market cap (30 SOL)</p>
              </div>
              <Link href={`/token/${createdToken.mint}`}>
                <motion.button
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className={`px-6 py-3 font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80] text-[#4ADE80] font-mono" 
                      : "bg-red-500 text-white"
                  }`}
                  data-testid="button-view-token"
                >
                  {privateMode ? "ACCESS_TERMINAL" : "View on Dum.fun"}
                </motion.button>
              </Link>
              <motion.button
                onClick={resetForm}
                whileHover={{ y: -2, x: -2 }}
                whileTap={{ y: 0, x: 0 }}
                className={`px-6 py-3 font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${
                  privateMode 
                    ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] font-mono" 
                    : "bg-white text-gray-900"
                }`}
                data-testid="button-create-another"
              >
                {privateMode ? "NEW_SESSION" : "Create Another"}
              </motion.button>
            </div>
          </motion.div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Coin Details Section */}
          <div className={`${privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white border-black"} border-2 rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <h2 className={`text-sm font-black mb-4 uppercase ${privateMode ? "text-[#4ADE80] font-mono" : "text-red-500"}`}>
              {privateMode ? "// ASSET_METADATA" : "COIN DETAILS"}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>
                  {privateMode ? "IDENTIFIER_NAME *" : "COIN NAME *"}
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={privateMode ? "> ENTER_NAME" : "Name your coin"}
                  maxLength={32}
                  className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono focus:outline-none transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                      : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                  }`}
                  data-testid="input-token-name"
                />
              </div>
              <div>
                <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>
                  {privateMode ? "TICKER_SYMBOL *" : "TICKER *"}
                </label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder={privateMode ? "> TICKER" : "Add a coin ticker (e.g., DUNI)"}
                  maxLength={10}
                  className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono focus:outline-none transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                      : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                  }`}
                  data-testid="input-token-symbol"
                />
              </div>
            </div>

            <div>
              <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>
                {privateMode ? "DESCRIPTION_LOG" : "DESCRIPTION (OPTIONAL)"}
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={privateMode ? "> DATA_STREAM" : "Write a short description"}
                rows={3}
                maxLength={500}
                className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono focus:outline-none transition-all resize-none ${
                  privateMode 
                    ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                    : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                }`}
                data-testid="input-token-description"
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className={`${privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white border-black"} border-2 rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <h2 className={`text-sm font-black mb-4 uppercase ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-700"}`}>
              {privateMode ? "// COMMS_PROTOCOLS" : "+ SOCIAL LINKS (OPTIONAL)"}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-600"}`}>TWITTER</label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono text-sm focus:outline-none transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                      : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                  }`}
                  data-testid="input-token-twitter"
                />
              </div>
              <div>
                <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-600"}`}>TELEGRAM</label>
                <input
                  type="url"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  placeholder="https://t.me/..."
                  className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono text-sm focus:outline-none transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                      : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                  }`}
                  data-testid="input-token-telegram"
                />
              </div>
              <div>
                <label className={`text-xs block mb-2 font-bold ${privateMode ? "text-[#4ADE80]/40 font-mono" : "text-gray-600"}`}>WEBSITE</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className={`w-full border-2 border-black rounded-lg px-3 py-2 font-mono text-sm focus:outline-none transition-all ${
                    privateMode 
                      ? "bg-black border-[#4ADE80]/30 text-[#4ADE80] placeholder-[#4ADE80]/30 focus:border-[#4ADE80]" 
                      : "bg-gray-50 text-gray-900 focus:ring-2 focus:ring-red-500"
                  }`}
                  data-testid="input-token-website"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className={`${privateMode ? "bg-zinc-900/50 border-[#4ADE80]/50" : "bg-white border-black"} border-2 rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
            <h2 className={`text-sm font-black mb-4 uppercase ${privateMode ? "text-[#4ADE80] font-mono" : "text-red-500"}`}>
              {privateMode ? "// VISUAL_ID" : "COIN IMAGE"}
            </h2>
            
            <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              privateMode ? "bg-black border-[#4ADE80]/30 hover:border-[#4ADE80]" : "bg-gray-50 border-gray-300 hover:border-red-500"
            }`}>
              {imagePreview ? (
                <div className="space-y-4">
                  <div className={`w-24 h-24 mx-auto rounded-lg overflow-hidden border-2 ${privateMode ? "border-[#4ADE80]" : "border-black"}`}>
                    <img src={imagePreview} alt="Token" className={`w-full h-full object-cover ${privateMode ? "opacity-80 sepia brightness-90 saturate-150 hue-rotate-60" : ""}`} />
                  </div>
                  <div>
                    <p className={`text-sm font-mono ${privateMode ? "text-[#4ADE80]" : "text-gray-600"}`}>{fileName}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFileName(null);
                      }}
                      className={`text-xs mt-2 underline font-bold ${privateMode ? "text-white" : "text-red-500 hover:text-red-600"}`}
                    >
                      Change image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="space-y-2">
                    <Upload className={`w-8 h-8 mx-auto ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`} />
                    <p className={`text-sm font-medium ${privateMode ? "text-[#4ADE80]/60 font-mono" : "text-gray-600"}`}>Select image to upload</p>
                    <p className={`text-xs ${privateMode ? "text-[#4ADE80]/30 font-mono" : "text-gray-400"}`}>or drag and drop here</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-token-image"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Privacy Options Section - Only visible in encrypted mode */}
          {privateMode && (
            <div className="bg-black border-[#4ADE80] border-2 rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-[#4ADE80]" />
                <h2 className="text-sm font-black uppercase text-[#4ADE80] font-mono">
                  // PRIVACY_CONFIG
                </h2>
              </div>
              
              <div className="space-y-4">
                <div 
                  onClick={() => setEnableConfidential(!enableConfidential)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    enableConfidential 
                      ? "bg-[#4ADE80]/10 border-[#4ADE80]" 
                      : "bg-zinc-900/50 border-[#4ADE80]/30 hover:border-[#4ADE80]/50"
                  }`}
                  data-testid="toggle-confidential-transfers"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enableConfidential ? "bg-[#4ADE80]/20" : "bg-zinc-800"}`}>
                      <Lock className={`w-4 h-4 ${enableConfidential ? "text-[#4ADE80]" : "text-[#4ADE80]/40"}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white font-mono">TOKEN-2022_CONFIDENTIAL</p>
                      <p className="text-xs text-[#4ADE80]/60 font-mono">// HIDDEN_BALANCES_AND_AMOUNTS</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    enableConfidential ? "bg-[#4ADE80]" : "bg-zinc-700"
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableConfidential ? "translate-x-6" : ""}`} />
                  </div>
                </div>

                <div 
                  onClick={() => setEnableStealth(!enableStealth)}
                  className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    enableStealth 
                      ? "bg-[#4ADE80]/10 border-[#4ADE80]" 
                      : "bg-zinc-900/50 border-[#4ADE80]/30 hover:border-[#4ADE80]/50"
                  }`}
                  data-testid="toggle-stealth-addresses"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${enableStealth ? "bg-[#4ADE80]/20" : "bg-zinc-800"}`}>
                      <Eye className={`w-4 h-4 ${enableStealth ? "text-[#4ADE80]" : "text-[#4ADE80]/40"}`} />
                    </div>
                    <div>
                      <p className="font-bold text-white font-mono">STEALTH_RECEIVING</p>
                      <p className="text-xs text-[#4ADE80]/60 font-mono">// UNLINKABLE_TOKEN_RECEIVING</p>
                    </div>
                  </div>
                  <div className={`w-12 h-6 rounded-full p-1 transition-colors ${
                    enableStealth ? "bg-[#4ADE80]" : "bg-zinc-700"
                  }`}>
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enableStealth ? "translate-x-6" : ""}`} />
                  </div>
                </div>
              </div>

              <p className="text-xs mt-4 text-[#4ADE80]/40 font-mono">
                // PRIVACY_FEATURES_USE_TOKEN-2022_EXTENSIONS
              </p>
            </div>
          )}

          {/* Creation Step Display */}
          {creationStep && (
            <div className={`border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
              privateMode ? "bg-black border-[#4ADE80] text-[#4ADE80]" : "bg-blue-50 text-blue-800"
            }`}>
              <div className="flex items-center gap-3">
                <Loader2 className={`w-5 h-5 animate-spin ${privateMode ? "text-[#4ADE80]" : "text-blue-600"}`} />
                <p className={`text-sm font-bold ${privateMode ? "font-mono" : ""}`}>{creationStep}</p>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <motion.button
            type="submit"
            disabled={createTokenMutation.isPending || !connectedWallet}
            whileHover={{ y: createTokenMutation.isPending || !connectedWallet ? 0 : -2, x: createTokenMutation.isPending || !connectedWallet ? 0 : -2 }}
            whileTap={{ y: 0, x: 0 }}
            className={`w-full py-4 font-black text-lg rounded-lg border-2 border-black transition-all ${
              createTokenMutation.isPending || !connectedWallet
                ? `bg-gray-300 text-gray-500 cursor-not-allowed shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${privateMode ? "opacity-30" : ""}`
                : privateMode 
                  ? "bg-black border-[#4ADE80] text-[#4ADE80] hover:shadow-[0_0_20px_rgba(57,255,20,0.4)] font-mono" 
                  : "bg-red-500 text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            }`}
            data-testid="button-create-token"
          >
            {createTokenMutation.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                {privateMode ? "EXECUTING_MINT..." : "Deploying to Devnet..."}
              </span>
            ) : !connectedWallet ? (
              privateMode ? "CONNECT_SESSION" : 'Connect Wallet to Deploy'
            ) : (
              privateMode ? "AUTHORIZE_DEPLOYMENT" : 'Deploy Token on Devnet'
            )}
          </motion.button>
        </form>
        )}
      </div>
    </Layout>
  );
}
