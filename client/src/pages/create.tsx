import { Layout } from "@/components/layout";
import { useWallet } from "@/lib/wallet-context";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Upload, Zap, Info, Loader2, CheckCircle, ExternalLink, Shield, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Buffer } from "buffer";
import { Connection, Transaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";

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
  const [privacyMode, setPrivacyMode] = useState(false);
  const [useDevnet, setUseDevnet] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);

  const [creationStep, setCreationStep] = useState<string>("");

  const fetchBalance = async () => {
    if (connectedWallet) {
      try {
        const res = await fetch(`/api/devnet/balance/${connectedWallet}`);
        const data = await res.json();
        setWalletBalance(data.balance);
      } catch (e) {
        console.error("Failed to fetch balance:", e);
      }
    }
  };

  useEffect(() => {
    if (connectedWallet && useDevnet) {
      fetchBalance();
    }
  }, [connectedWallet, useDevnet]);

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
      if (privacyMode || !useDevnet) {
        setCreationStep(privacyMode ? "Creating token anonymously..." : "Creating token in demo mode...");
        
        const creatorAddr = privacyMode ? "anonymous" : (connectedWallet || "anonymous");
        
        const res = await fetch("/api/tokens/demo-create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            symbol: formData.symbol,
            description: formData.description || null,
            imageUri: imagePreview || null,
            twitter: formData.twitter || null,
            telegram: formData.telegram || null,
            website: formData.website || null,
            creatorAddress: creatorAddr,
            privacyMode: privacyMode,
          }),
        });
        
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to create token");
        }
        
        const data = await res.json();
        setCreationStep("Token created!");
        return { token: data.token, signature: "demo-" + data.token.mint.slice(0, 8) };
      }

      if (!connectedWallet) {
        throw new Error("Connect wallet to deploy on devnet");
      }

      const phantom = (window as any).phantom?.solana;
      if (!phantom?.isPhantom) {
        throw new Error("Phantom wallet required for devnet deployment");
      }

      setCreationStep("Building transaction...");
      
      const buildRes = await fetch("/api/tokens/devnet-create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          symbol: formData.symbol,
          creatorAddress: connectedWallet,
          description: formData.description || null,
          imageUri: imagePreview || null,
        }),
      });

      if (!buildRes.ok) {
        const error = await buildRes.json();
        throw new Error(error.error || "Failed to build transaction");
      }

      const { transaction: txBase64, mint } = await buildRes.json();
      
      setCreationStep("Please sign the transaction in your wallet...");
      
      const txBytes = Buffer.from(txBase64, "base64");
      const transaction = Transaction.from(txBytes);
      
      const signedTx = await phantom.signTransaction(transaction);
      
      setCreationStep("Submitting to Solana devnet...");
      
      const connection = new Connection(SOLANA_RPC, "confirmed");
      const signature = await connection.sendRawTransaction(signedTx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      setCreationStep("Confirming transaction...");
      
      await connection.confirmTransaction(signature, "confirmed");
      
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
      setCreationStep("Token deployed on Solana devnet!");
      
      return { token, signature };
    },
    onSuccess: (data) => {
      const mode = useDevnet && !privacyMode ? "devnet" : (privacyMode ? "privately" : "demo mode");
      toast.success(`Token ${data.token.name} created on ${mode}!`);
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
    
    // In privacy mode, wallet is not required
    if (!privacyMode && !connectedWallet) {
      toast.error("Please connect your wallet first, or enable Privacy Mode");
      return;
    }

    if (!formData.name || !formData.symbol) {
      toast.error("Name and symbol are required");
      return;
    }

    createTokenMutation.mutate();
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
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className={`border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${useDevnet && !privacyMode ? 'bg-green-100' : 'bg-yellow-100'}`}>
          <p className={`text-sm font-bold ${useDevnet && !privacyMode ? 'text-green-800' : 'text-yellow-800'}`}>
            {useDevnet && !privacyMode 
              ? '🚀 DEVNET MODE: Tokens will be deployed to Solana devnet - real on-chain transactions!'
              : privacyMode 
                ? '🔒 PRIVACY MODE: Token created anonymously in demo database'
                : '⚠️ DEMO MODE: Tokens created here are saved to our demo database only'}
          </p>
        </div>

        {/* Devnet Controls */}
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${useDevnet ? 'bg-purple-500' : 'bg-gray-200'}`}>
                <Zap className={`w-5 h-5 ${useDevnet ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Deploy to Devnet</p>
                <p className="text-xs text-gray-600">
                  {useDevnet ? 'Real Solana transactions on devnet' : 'Save to database only (demo)'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setUseDevnet(!useDevnet)}
              disabled={privacyMode}
              className={`px-4 py-2 font-bold rounded-lg border-2 border-black transition-all ${
                useDevnet 
                  ? 'bg-purple-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-white text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              } ${privacyMode ? 'opacity-50 cursor-not-allowed' : ''}`}
              data-testid="button-toggle-devnet"
            >
              {useDevnet ? 'ON-CHAIN' : 'DEMO'}
            </button>
          </div>
          
          {useDevnet && connectedWallet && (
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div>
                <p className="text-xs text-gray-500">Devnet Balance</p>
                <p className="font-bold text-gray-900">
                  {walletBalance !== null ? `${walletBalance.toFixed(4)} SOL` : 'Loading...'}
                </p>
              </div>
              <button
                type="button"
                onClick={requestAirdrop}
                className="px-3 py-1 text-sm font-bold bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                data-testid="button-request-airdrop"
              >
                Request Airdrop
              </button>
            </div>
          )}
          
          {privacyMode && (
            <p className="text-xs text-gray-500 mt-2">
              Devnet deployment disabled in Privacy Mode
            </p>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${privacyMode ? 'bg-green-100' : 'bg-white'}`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${privacyMode ? 'bg-green-500' : 'bg-gray-200'}`}>
                <Shield className={`w-5 h-5 ${privacyMode ? 'text-white' : 'text-gray-500'}`} />
              </div>
              <div>
                <p className="font-bold text-gray-900">Privacy Mode</p>
                <p className="text-xs text-gray-600">
                  {privacyMode ? 'Your wallet address will be hidden' : 'Enable to hide your wallet address'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPrivacyMode(!privacyMode)}
              className={`px-4 py-2 font-bold rounded-lg border-2 border-black transition-all ${
                privacyMode 
                  ? 'bg-green-500 text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]' 
                  : 'bg-white text-gray-700 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'
              }`}
              data-testid="button-toggle-privacy"
            >
              <span className="flex items-center gap-2">
                {privacyMode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {privacyMode ? 'PRIVATE' : 'PUBLIC'}
              </span>
            </button>
          </div>
          {privacyMode && (
            <div className="mt-3 p-2 bg-green-200 rounded-lg">
              <p className="text-xs text-green-800 font-medium">
                Solana Privacy Hack 2026 Feature: Anonymous token creation hides your wallet from other users.
              </p>
            </div>
          )}
        </motion.div>

        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-900">Launch New Token</h1>
          <p className="text-gray-500 mt-1">
            Fields marked with * cannot be changed once created
          </p>
        </div>

        {createdToken ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-green-50 border-2 border-black rounded-lg p-6 text-center space-y-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          >
            <CheckCircle className="w-16 h-16 mx-auto text-green-600" />
            <div>
              <h2 className="text-2xl font-black text-green-700">TOKEN DEPLOYED!</h2>
              <p className="text-gray-600 text-sm mt-2">
                Your token <span className="text-gray-900 font-bold">{createdToken.name}</span> ({createdToken.symbol}) is now live on Pump.fun!
              </p>
            </div>
            <div className="bg-white border-2 border-black rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1 font-bold">Token Mint Address</p>
              <p className="text-green-600 font-mono text-sm break-all">{createdToken.mint}</p>
            </div>
            {createdToken.signature && (
              <div className="bg-white border-2 border-black rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1 font-bold">Transaction Signature</p>
                <a 
                  href={`https://solscan.io/tx/${createdToken.signature}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 font-mono text-sm break-all hover:underline flex items-center justify-center gap-1"
                  data-testid="link-transaction"
                >
                  {createdToken.signature.slice(0, 20)}...{createdToken.signature.slice(-20)}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href={`/token/${createdToken.mint}`}>
                <motion.button
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className="px-6 py-3 bg-red-500 text-white font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                  data-testid="button-view-token"
                >
                  View on Dum.fun
                </motion.button>
              </Link>
              <motion.button
                onClick={resetForm}
                whileHover={{ y: -2, x: -2 }}
                whileTap={{ y: 0, x: 0 }}
                className="px-6 py-3 bg-white text-gray-900 font-bold rounded-lg border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
                data-testid="button-create-another"
              >
                Create Another
              </motion.button>
            </div>
          </motion.div>
        ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Coin Details Section */}
          <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black text-red-500 mb-4 uppercase">COIN DETAILS</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">COIN NAME *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Name your coin"
                  maxLength={32}
                  className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  data-testid="input-token-name"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">TICKER *</label>
                <input
                  type="text"
                  value={formData.symbol}
                  onChange={(e) => setFormData({ ...formData, symbol: e.target.value.toUpperCase() })}
                  placeholder="Add a coin ticker (e.g., DUNI)"
                  maxLength={10}
                  className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none"
                  data-testid="input-token-symbol"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-600 block mb-2 font-bold">DESCRIPTION (OPTIONAL)</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Write a short description"
                rows={3}
                maxLength={500}
                className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 focus:ring-2 focus:ring-red-500 focus:outline-none resize-none"
                data-testid="input-token-description"
              />
            </div>
          </div>

          {/* Social Links Section */}
          <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black text-gray-700 mb-4 uppercase">+ SOCIAL LINKS (OPTIONAL)</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">TWITTER</label>
                <input
                  type="url"
                  value={formData.twitter}
                  onChange={(e) => setFormData({ ...formData, twitter: e.target.value })}
                  placeholder="https://twitter.com/..."
                  className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  data-testid="input-token-twitter"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">TELEGRAM</label>
                <input
                  type="url"
                  value={formData.telegram}
                  onChange={(e) => setFormData({ ...formData, telegram: e.target.value })}
                  placeholder="https://t.me/..."
                  className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  data-testid="input-token-telegram"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 block mb-2 font-bold">WEBSITE</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://..."
                  className="w-full bg-gray-50 border-2 border-black rounded-lg px-3 py-2 font-mono text-gray-900 text-sm focus:ring-2 focus:ring-red-500 focus:outline-none"
                  data-testid="input-token-website"
                />
              </div>
            </div>
          </div>

          {/* Image Upload Section */}
          <div className="bg-white border-2 border-black rounded-lg p-6 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-sm font-black text-red-500 mb-4 uppercase">COIN IMAGE</h2>
            
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-red-500 transition-colors bg-gray-50">
              {imagePreview ? (
                <div className="space-y-4">
                  <div className="w-24 h-24 mx-auto rounded-lg overflow-hidden border-2 border-black">
                    <img src={imagePreview} alt="Token" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-mono">{fileName}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreview(null);
                        setFileName(null);
                      }}
                      className="text-red-500 hover:text-red-600 text-xs mt-2 underline font-bold"
                    >
                      Change image
                    </button>
                  </div>
                </div>
              ) : (
                <label className="cursor-pointer block">
                  <div className="space-y-2">
                    <Upload className="w-8 h-8 mx-auto text-gray-400" />
                    <p className="text-gray-600 text-sm font-medium">Select video or image to upload</p>
                    <p className="text-gray-400 text-xs">or drag and drop here</p>
                  </div>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleImageChange}
                    className="hidden"
                    data-testid="input-token-image"
                  />
                </label>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 font-bold mb-1">File size and type</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  <li>• Image: <span className="text-gray-600">2mb</span></li>
                  <li>• Video: <span className="text-gray-600">2mb</span></li>
                  <li>• Format: <span className="text-gray-600">JPG, PNG or MP4</span></li>
                </ul>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <p className="text-xs text-gray-700 font-bold mb-1">Resolution and aspect ratio</p>
                <ul className="text-xs text-gray-500 space-y-0.5">
                  <li>• Image: <span className="text-gray-600">1000x1000px</span></li>
                  <li>• Video: <span className="text-gray-600">16:9, 1080x600px</span></li>
                </ul>
              </div>
            </div>
          </div>

          {/* Launch Cost Section */}
          <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-green-700 font-bold text-sm">DEMO MODE: FREE</p>
                <p className="text-gray-600 text-xs mt-1">Tokens are saved to demo database (no SOL required)</p>
              </div>
            </div>
          </div>

          {connectedWallet ? (
            <motion.button
              type="submit"
              disabled={createTokenMutation.isPending}
              whileHover={{ y: createTokenMutation.isPending ? 0 : -2, x: createTokenMutation.isPending ? 0 : -2 }}
              whileTap={{ y: 0, x: 0 }}
              className={`w-full bg-green-500 hover:bg-green-600 text-white font-black py-4 rounded-lg uppercase transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 ${createTokenMutation.isPending ? "opacity-70 cursor-not-allowed" : ""}`}
              data-testid="button-create-token"
            >
              {createTokenMutation.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {creationStep || "CREATING..."}
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  CREATE COIN
                </>
              )}
            </motion.button>
          ) : (
            <motion.button
              type="button"
              onClick={() => connectWallet()}
              whileHover={{ y: -2, x: -2 }}
              whileTap={{ y: 0, x: 0 }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-lg uppercase transition-all border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            >
              Connect Wallet to Create
            </motion.button>
          )}
        </form>
        )}
      </div>
    </Layout>
  );
}
