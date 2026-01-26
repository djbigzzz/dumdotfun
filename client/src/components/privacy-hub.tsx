import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, Eye, EyeOff, Send, Key, Copy, Check, RefreshCw, 
  Lock, Zap, ArrowDownToLine, ArrowUpFromLine, Activity,
  CheckCircle, XCircle, Clock, ExternalLink, FileText
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type TabType = "shadowwire" | "token2022" | "stealth" | "arcium" | "activity";

interface PrivateBalance {
  sol: number;
  usdc: number;
  loading: boolean;
}

interface StealthAddress {
  address: string;
  ephemeralPublicKey: string;
  viewTag: string;
  createdAt: number;
}

interface ActivityItem {
  id: string;
  type: "shadowwire" | "stealth" | "token2022" | "arcium" | "deposit" | "withdraw";
  description: string;
  amount?: number;
  token?: string;
  timestamp: number;
  status: "success" | "pending" | "failed";
  txSignature?: string;
}

interface IntegrationStatus {
  name: string;
  available: boolean;
  version?: string;
  features?: string[];
}

export function PrivacyHub() {
  const { connectedWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState<TabType>("shadowwire");
  const [shadowWireBalance, setShadowWireBalance] = useState<PrivateBalance>({ sol: 0, usdc: 0, loading: true });
  const [privacyCashBalance, setPrivacyCashBalance] = useState<PrivateBalance>({ sol: 0, usdc: 0, loading: true });
  const [stealthAddresses, setStealthAddresses] = useState<StealthAddress[]>([]);
  const [showBalances, setShowBalances] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationStatus[]>([]);
  
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferToken, setTransferToken] = useState("SOL");
  
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [commitmentAmount, setCommitmentAmount] = useState("");
  const [arciumAmount, setArciumAmount] = useState("");
  const [arciumRecipient, setArciumRecipient] = useState("");
  const [arciumToken, setArciumToken] = useState("SOL");

  useEffect(() => {
    if (connectedWallet) {
      fetchBalances();
      fetchIntegrations();
    }
  }, [connectedWallet]);

  const fetchBalances = async () => {
    if (!connectedWallet) return;
    
    setShadowWireBalance(prev => ({ ...prev, loading: true }));
    setPrivacyCashBalance(prev => ({ ...prev, loading: true }));
    
    try {
      const [swRes, pcRes] = await Promise.all([
        fetch(`/api/privacy/shadowwire/balance/${connectedWallet}`),
        fetch(`/api/privacy/cash/balance/${connectedWallet}`)
      ]);
      
      if (swRes.ok) {
        const swData = await swRes.json();
        setShadowWireBalance({ 
          sol: swData.balance?.available || swData.balances?.SOL || 0, 
          usdc: swData.balances?.USDC || 0, 
          loading: false 
        });
      } else {
        setShadowWireBalance({ sol: 0, usdc: 0, loading: false });
      }
      
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        setPrivacyCashBalance({ 
          sol: pcData.balance?.privateBalance || pcData.balance?.balance || 0, 
          usdc: 0, 
          loading: false 
        });
      } else {
        setPrivacyCashBalance({ sol: 0, usdc: 0, loading: false });
      }
    } catch (error) {
      console.error("Failed to fetch private balances:", error);
      setShadowWireBalance({ sol: 0, usdc: 0, loading: false });
      setPrivacyCashBalance({ sol: 0, usdc: 0, loading: false });
    }
  };

  const fetchIntegrations = async () => {
    try {
      const res = await fetch("/api/privacy/status");
      if (res.ok) {
        const data = await res.json();
        setIntegrations(data.integrations || []);
      }
    } catch (error) {
      console.error("Failed to fetch integrations:", error);
    }
  };

  const addActivity = (item: Omit<ActivityItem, "id" | "timestamp">) => {
    const newItem: ActivityItem = {
      ...item,
      id: Math.random().toString(36).slice(2),
      timestamp: Date.now()
    };
    setActivity(prev => [newItem, ...prev.slice(0, 19)]);
  };

  const handleShadowWireTransfer = async () => {
    if (!connectedWallet || !transferRecipient || !transferAmount) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/shadowwire/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderAddress: connectedWallet,
          recipientAddress: transferRecipient,
          amount: parseFloat(transferAmount),
          token: transferToken,
          type: "external"
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Private Transfer Initiated",
          description: `Sending ${transferAmount} ${transferToken} privately via ShadowWire`,
        });
        addActivity({
          type: "shadowwire",
          description: `Private transfer to ${transferRecipient.slice(0, 8)}...`,
          amount: parseFloat(transferAmount),
          token: transferToken,
          status: "success",
          txSignature: data.transaction?.signature
        });
        setTransferRecipient("");
        setTransferAmount("");
        setTimeout(() => fetchBalances(), 1000);
      } else {
        const error = await res.json();
        toast({
          title: "Transfer failed",
          description: error.error || "Unknown error",
          variant: "destructive",
        });
        addActivity({
          type: "shadowwire",
          description: `Failed transfer to ${transferRecipient.slice(0, 8)}...`,
          amount: parseFloat(transferAmount),
          token: transferToken,
          status: "failed"
        });
      }
    } catch (error) {
      toast({
        title: "Transfer failed",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDeposit = async () => {
    if (!connectedWallet || !depositAmount) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/cash/deposit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress: connectedWallet, 
          amount: parseFloat(depositAmount),
          token: "SOL"
        })
      });
      
      if (res.ok) {
        toast({
          title: "Private Deposit Complete",
          description: `Shielded ${depositAmount} SOL into private balance`,
        });
        addActivity({
          type: "deposit",
          description: `Deposited ${depositAmount} SOL to private balance`,
          amount: parseFloat(depositAmount),
          token: "SOL",
          status: "success"
        });
        setDepositAmount("");
        setTimeout(() => fetchBalances(), 500);
      } else {
        const error = await res.json();
        toast({
          title: "Deposit failed",
          description: error.error || "Unknown error",
          variant: "destructive",
        });
        addActivity({
          type: "deposit",
          description: `Failed: ${error.error || "Deposit failed"}`,
          amount: parseFloat(depositAmount),
          token: "SOL",
          status: "failed"
        });
      }
    } catch (error) {
      toast({ title: "Deposit failed", variant: "destructive" });
      addActivity({
        type: "deposit",
        description: "Deposit failed",
        amount: parseFloat(depositAmount),
        token: "SOL",
        status: "failed"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!connectedWallet || !withdrawAmount) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/cash/withdraw", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          walletAddress: connectedWallet, 
          recipientAddress: connectedWallet,
          amount: parseFloat(withdrawAmount),
          token: "SOL"
        })
      });
      
      if (res.ok) {
        toast({
          title: "Private Withdrawal Complete",
          description: `Withdrawn ${withdrawAmount} SOL anonymously`,
        });
        addActivity({
          type: "withdraw",
          description: `Withdrew ${withdrawAmount} SOL privately`,
          amount: parseFloat(withdrawAmount),
          token: "SOL",
          status: "success"
        });
        setWithdrawAmount("");
        setTimeout(() => fetchBalances(), 500);
      } else {
        const error = await res.json();
        toast({
          title: "Withdrawal failed",
          description: error.error || "Unknown error",
          variant: "destructive",
        });
        addActivity({
          type: "withdraw",
          description: `Failed: ${error.error || "Withdrawal failed"}`,
          amount: parseFloat(withdrawAmount),
          token: "SOL",
          status: "failed"
        });
      }
    } catch (error) {
      toast({ title: "Withdrawal failed", variant: "destructive" });
      addActivity({
        type: "withdraw",
        description: "Withdrawal failed",
        amount: parseFloat(withdrawAmount),
        token: "SOL",
        status: "failed"
      });
    } finally {
      setProcessing(false);
    }
  };

  const generateStealthAddress = async () => {
    if (!connectedWallet) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/stealth-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientWallet: connectedWallet })
      });
      
      if (res.ok) {
        const data = await res.json();
        const newStealth: StealthAddress = {
          address: data.stealthAddress,
          ephemeralPublicKey: data.ephemeralPublicKey,
          viewTag: data.viewTag,
          createdAt: Date.now()
        };
        setStealthAddresses(prev => [newStealth, ...prev.slice(0, 4)]);
        toast({
          title: "Stealth Address Generated",
          description: "Use this address to receive tokens privately",
        });
        addActivity({
          type: "stealth",
          description: `Generated stealth address ${data.stealthAddress.slice(0, 12)}...`,
          status: "success"
        });
      } else {
        const error = await res.json();
        toast({ 
          title: "Failed to generate stealth address", 
          description: error.error || "Unknown error",
          variant: "destructive" 
        });
        addActivity({
          type: "stealth",
          description: `Failed: ${error.error || "Unknown error"}`,
          status: "failed"
        });
      }
    } catch (error) {
      toast({ title: "Failed to generate stealth address", variant: "destructive" });
      addActivity({
        type: "stealth",
        description: "Failed to generate stealth address",
        status: "failed"
      });
    } finally {
      setProcessing(false);
    }
  };

  const createConfidentialCommitment = async () => {
    if (!connectedWallet || !commitmentAmount) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/confidential-transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderWallet: connectedWallet,
          recipientWallet: connectedWallet,
          amount: parseFloat(commitmentAmount),
          mintAddress: "So11111111111111111111111111111111111111112"
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Confidential Commitment Created",
          description: `Token-2022 commitment for ${commitmentAmount} SOL`,
        });
        addActivity({
          type: "token2022",
          description: `Created commitment: ${data.commitment?.slice(0, 16)}...`,
          amount: parseFloat(commitmentAmount),
          token: "SOL",
          status: "success"
        });
        setCommitmentAmount("");
      } else {
        const error = await res.json();
        toast({
          title: "Commitment creation failed",
          description: error.error || "Unknown error",
          variant: "destructive",
        });
        addActivity({
          type: "token2022",
          description: `Failed: ${error.error || "Unknown error"}`,
          amount: parseFloat(commitmentAmount),
          token: "SOL",
          status: "failed"
        });
      }
    } catch (error) {
      toast({ title: "Failed to create commitment", variant: "destructive" });
      addActivity({
        type: "token2022",
        description: "Failed to create commitment",
        amount: parseFloat(commitmentAmount),
        token: "SOL",
        status: "failed"
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleArciumTransfer = async () => {
    if (!connectedWallet || !arciumRecipient || !arciumAmount) return;
    setProcessing(true);
    
    try {
      const res = await fetch("/api/privacy/arcium/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderWallet: connectedWallet,
          recipientWallet: arciumRecipient,
          amount: parseFloat(arciumAmount),
          token: arciumToken
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Arcium MPC Transfer Complete",
          description: `Encrypted transfer of ${arciumAmount} ${arciumToken} processed`,
        });
        addActivity({
          type: "arcium",
          description: `MPC Transfer to ${arciumRecipient.slice(0, 8)}...`,
          amount: parseFloat(arciumAmount),
          token: arciumToken,
          status: "success",
          txSignature: data.signature
        });
        setArciumAmount("");
        setArciumRecipient("");
      } else {
        const error = await res.json();
        toast({
          title: "Arcium transfer failed",
          description: error.error || "Unknown error",
          variant: "destructive",
        });
        addActivity({
          type: "arcium",
          description: `MPC Transfer Failed: ${error.error || "Unknown error"}`,
          status: "failed"
        });
      }
    } catch (error) {
      toast({ title: "Arcium transfer failed", variant: "destructive" });
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatBalance = (amount: number) => {
    if (!showBalances) return "••••••";
    return amount.toFixed(4);
  };

  const getStatusIcon = (available: boolean) => {
    return available ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: "shadowwire", label: "ShadowWire", icon: <Shield className="w-4 h-4" /> },
    { id: "token2022", label: "Token-2022", icon: <Lock className="w-4 h-4" /> },
    { id: "stealth", label: "Stealth", icon: <Key className="w-4 h-4" /> },
    { id: "arcium", label: "Arcium", icon: <Shield className="w-4 h-4" /> },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  ];

  const totalPrivateSOL = shadowWireBalance.sol + privacyCashBalance.sol;

  return (
    <div className={`border-2 border-black rounded-xl overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
      privateMode ? "bg-black border-[#10B981]" : "bg-white"
    }`} data-testid="privacy-hub">
      <div className={`p-4 border-b-2 ${privateMode ? "border-[#10B981]/30 bg-zinc-900" : "border-gray-200 bg-gradient-to-r from-purple-100 to-indigo-100"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className={`w-6 h-6 ${privateMode ? "text-[#10B981]" : "text-purple-600"}`} />
            <h2 className={`text-xl font-black uppercase ${privateMode ? "text-[#10B981] font-mono" : "text-gray-900"}`}>
              {privateMode ? "PRIVACY_HUB" : "Privacy Hub"}
            </h2>
            <span className={`px-2 py-0.5 text-xs font-bold rounded ${privateMode ? "bg-[#10B981]/20 text-[#10B981]" : "bg-purple-200 text-purple-700"}`}>
              JUDGE DEMO
            </span>
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              onClick={() => setShowBalances(!showBalances)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg ${privateMode ? "text-[#10B981] hover:bg-[#10B981]/10" : "text-gray-600 hover:bg-gray-200"}`}
              data-testid="button-toggle-balance"
            >
              {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </motion.button>
            <motion.button
              onClick={fetchBalances}
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.95 }}
              className={`p-2 rounded-lg ${privateMode ? "text-[#10B981] hover:bg-[#10B981]/10" : "text-gray-600 hover:bg-gray-200"}`}
              data-testid="button-refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </motion.button>
          </div>
        </div>

        <div className={`grid grid-cols-2 gap-3 p-3 rounded-lg border-2 ${privateMode ? "bg-black border-[#10B981]/30" : "bg-white/50 border-gray-200"}`}>
          <div>
            <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
              Total Private SOL
            </p>
            <p className={`text-2xl font-mono font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
              {shadowWireBalance.loading || privacyCashBalance.loading ? "..." : formatBalance(totalPrivateSOL)}
            </p>
          </div>
          <div>
            <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
              Active Integrations
            </p>
            <p className={`text-2xl font-mono font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
              {integrations.filter(i => i.available).length}/{integrations.length}
            </p>
          </div>
        </div>
      </div>

      <div className={`flex border-b-2 ${privateMode ? "border-[#10B981]/30" : "border-gray-200"}`}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold uppercase transition-colors ${
              activeTab === tab.id
                ? privateMode
                  ? "bg-[#10B981]/20 text-[#10B981] border-b-2 border-[#10B981]"
                  : "bg-purple-100 text-purple-700 border-b-2 border-purple-500"
                : privateMode
                  ? "text-[#10B981]/50 hover:bg-[#10B981]/10"
                  : "text-gray-500 hover:bg-gray-100"
            }`}
            data-testid={`tab-${tab.id}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      <div className="p-4">
        <AnimatePresence mode="wait">
          {activeTab === "shadowwire" && (
            <motion.div
              key="shadowwire"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-purple-50 border-purple-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(integrations.find(i => i.name.includes("ShadowWire"))?.available ?? true)}
                  <span className={`text-sm font-bold ${privateMode ? "text-[#10B981]" : "text-purple-700"}`}>
                    ShadowWire SDK v1.1.15
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-600"}`}>
                  Bulletproof ZK proofs for private transfers. Supports 22 tokens including SOL, USDC, BONK.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className={`text-sm font-bold uppercase ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Send Private Transfer
                </h3>
                <input
                  type="text"
                  value={transferRecipient}
                  onChange={(e) => setTransferRecipient(e.target.value)}
                  placeholder="Recipient wallet address"
                  className={`w-full px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                    privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                  }`}
                  data-testid="input-transfer-recipient"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={transferAmount}
                    onChange={(e) => setTransferAmount(e.target.value)}
                    placeholder="Amount"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                      privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                    }`}
                    data-testid="input-transfer-amount"
                  />
                  <select
                    value={transferToken}
                    onChange={(e) => setTransferToken(e.target.value)}
                    className={`px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                      privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                    }`}
                    data-testid="select-transfer-token"
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                    <option value="BONK">BONK</option>
                  </select>
                </div>
                <motion.button
                  onClick={handleShadowWireTransfer}
                  disabled={processing || !transferRecipient || !transferAmount}
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 ${
                    privateMode ? "bg-[#10B981] text-black" : "bg-purple-500 text-white"
                  }`}
                  data-testid="button-send-private-transfer"
                >
                  <Send className="w-4 h-4" />
                  {processing ? "Processing..." : "Send Private Transfer"}
                </motion.button>
              </div>

              <div className={`border-t-2 pt-4 ${privateMode ? "border-[#10B981]/30" : "border-gray-200"}`}>
                <h3 className={`text-sm font-bold uppercase mb-3 ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Quick Actions
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="SOL amount"
                      className={`w-full px-3 py-2 rounded-lg border-2 font-mono text-sm ${
                        privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                      }`}
                      data-testid="input-deposit-amount"
                    />
                    <motion.button
                      onClick={handleDeposit}
                      disabled={processing || !depositAmount}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 py-2 font-bold text-xs uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 ${
                        privateMode ? "bg-[#10B981] text-black" : "bg-green-400 text-black"
                      }`}
                      data-testid="button-deposit"
                    >
                      <ArrowDownToLine className="w-3 h-3" />
                      Deposit
                    </motion.button>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="SOL amount"
                      className={`w-full px-3 py-2 rounded-lg border-2 font-mono text-sm ${
                        privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                      }`}
                      data-testid="input-withdraw-amount"
                    />
                    <motion.button
                      onClick={handleWithdraw}
                      disabled={processing || !withdrawAmount}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center justify-center gap-2 py-2 font-bold text-xs uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 ${
                        privateMode ? "bg-black border-[#10B981] text-[#10B981]" : "bg-white text-gray-700"
                      }`}
                      data-testid="button-withdraw"
                    >
                      <ArrowUpFromLine className="w-3 h-3" />
                      Withdraw
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "token2022" && (
            <motion.div
              key="token2022"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-blue-50 border-blue-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(true)}
                  <span className={`text-sm font-bold ${privateMode ? "text-[#10B981]" : "text-blue-700"}`}>
                    Token-2022 Confidential Transfers
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-600"}`}>
                  Pedersen commitment scheme for hidden amounts. Hybrid implementation ready for ZK ElGamal when mainnet enables.
                </p>
                <div className={`mt-2 p-2 rounded text-xs font-mono ${privateMode ? "bg-black text-[#10B981]/60" : "bg-gray-100 text-gray-500"}`}>
                  Program ID: TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={`text-sm font-bold uppercase ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Create Confidential Commitment
                </h3>
                <p className={`text-xs ${privateMode ? "text-[#10B981]/40 font-mono" : "text-gray-500"}`}>
                  Generate a cryptographic commitment that hides the transfer amount from observers.
                </p>
                <input
                  type="number"
                  value={commitmentAmount}
                  onChange={(e) => setCommitmentAmount(e.target.value)}
                  placeholder="Amount to commit (SOL)"
                  className={`w-full px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                    privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                  }`}
                  data-testid="input-commitment-amount"
                />
                <motion.button
                  onClick={createConfidentialCommitment}
                  disabled={processing || !commitmentAmount}
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 ${
                    privateMode ? "bg-[#10B981] text-black" : "bg-blue-500 text-white"
                  }`}
                  data-testid="button-create-commitment"
                >
                  <Lock className="w-4 h-4" />
                  {processing ? "Processing..." : "Create Commitment"}
                </motion.button>
              </div>

              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-4 h-4 ${privateMode ? "text-amber-400" : "text-amber-600"}`} />
                  <span className={`text-sm font-bold ${privateMode ? "text-amber-400" : "text-amber-700"}`}>
                    Bounty: $15,000
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-amber-400/60" : "text-amber-700/70"}`}>
                  Token-2022 Confidential Transfers implementation with hybrid fallback for current devnet limitations.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "stealth" && (
            <motion.div
              key="stealth"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-green-50 border-green-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(true)}
                  <span className={`text-sm font-bold ${privateMode ? "text-[#10B981]" : "text-green-700"}`}>
                    Stealth Addresses (Anoncoin)
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-600"}`}>
                  One-time receive addresses using ECC key derivation. Each address is unlinkable to your main wallet.
                </p>
              </div>

              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold uppercase ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Your Stealth Addresses
                </h3>
                <motion.button
                  onClick={generateStealthAddress}
                  disabled={processing}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-3 py-1.5 text-xs font-bold uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:opacity-50 ${
                    privateMode ? "bg-[#10B981] text-black" : "bg-green-400 text-black"
                  }`}
                  data-testid="button-generate-stealth"
                >
                  {processing ? "..." : "+ Generate New"}
                </motion.button>
              </div>

              {stealthAddresses.length === 0 ? (
                <div className={`text-center py-6 rounded-lg border-2 border-dashed ${
                  privateMode ? "border-[#10B981]/30 text-[#10B981]/40" : "border-gray-300 text-gray-400"
                }`}>
                  <Key className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-mono">No stealth addresses yet</p>
                  <p className="text-xs mt-1">Click "Generate New" to create one</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {stealthAddresses.map((stealth, i) => (
                    <div 
                      key={stealth.address}
                      className={`p-3 rounded-lg border-2 ${
                        privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className={`font-mono text-sm font-bold truncate flex-1 mr-2 ${privateMode ? "text-white" : "text-gray-700"}`}>
                          {stealth.address.slice(0, 24)}...
                        </p>
                        <motion.button
                          onClick={() => copyToClipboard(stealth.address, stealth.address)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`p-1.5 rounded ${privateMode ? "text-[#10B981] hover:bg-[#10B981]/10" : "text-gray-500 hover:bg-gray-100"}`}
                          data-testid={`button-copy-stealth-${i}`}
                        >
                          {copied === stealth.address ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </motion.button>
                      </div>
                      <div className="flex items-center gap-3 text-xs">
                        <span className={privateMode ? "text-[#10B981]/40" : "text-gray-400"}>
                          View tag: <span className="font-mono">{stealth.viewTag}</span>
                        </span>
                        <span className={privateMode ? "text-[#10B981]/40" : "text-gray-400"}>
                          {new Date(stealth.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-4 h-4 ${privateMode ? "text-amber-400" : "text-amber-600"}`} />
                  <span className={`text-sm font-bold ${privateMode ? "text-amber-400" : "text-amber-700"}`}>
                    Bounty: $10,000 (Anoncoin)
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-amber-400/60" : "text-amber-700/70"}`}>
                  ECC-based stealth addresses for unlinkable token receiving.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "arcium" && (
            <motion.div
              key="arcium"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-zinc-50 border-zinc-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  {getStatusIcon(true)}
                  <span className={`text-sm font-bold ${privateMode ? "text-[#10B981]" : "text-zinc-700"}`}>
                    Arcium C-SPL (MPC)
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-600"}`}>
                  Confidential SPL tokens using Multi-Party Computation. Both balances and amounts stay hidden during computation.
                </p>
                <div className={`mt-2 p-2 rounded text-xs font-mono ${privateMode ? "bg-black text-[#10B981]/60" : "bg-gray-100 text-gray-500"}`}>
                  Program ID: Arc1umqwQTBocXKzfJRqNrVkDCmQmP7zQ6y4b9qFpUFX
                </div>
              </div>

              <div className="space-y-3">
                <h3 className={`text-sm font-bold uppercase ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Private MPC Transfer
                </h3>
                <input
                  type="text"
                  value={arciumRecipient}
                  onChange={(e) => setArciumRecipient(e.target.value)}
                  placeholder="Recipient C-SPL address"
                  className={`w-full px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                    privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                  }`}
                  data-testid="input-arcium-recipient"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={arciumAmount}
                    onChange={(e) => setArciumAmount(e.target.value)}
                    placeholder="Amount"
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                      privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                    }`}
                    data-testid="input-arcium-amount"
                  />
                  <select
                    value={arciumToken}
                    onChange={(e) => setArciumToken(e.target.value)}
                    className={`px-4 py-3 rounded-lg border-2 font-mono text-sm ${
                      privateMode ? "bg-black text-white border-[#10B981]/30" : "bg-gray-100 border-gray-300"
                    }`}
                  >
                    <option value="SOL">SOL</option>
                    <option value="USDC">USDC</option>
                  </select>
                </div>
                <motion.button
                  onClick={handleArciumTransfer}
                  disabled={processing || !arciumRecipient || !arciumAmount}
                  whileHover={{ y: -2, x: -2 }}
                  whileTap={{ y: 0, x: 0 }}
                  className={`w-full flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all disabled:opacity-50 ${
                    privateMode ? "bg-[#10B981] text-black" : "bg-zinc-800 text-white"
                  }`}
                  data-testid="button-arcium-transfer"
                >
                  <Shield className="w-4 h-4" />
                  {processing ? "Processing..." : "Secure MPC Transfer"}
                </motion.button>
              </div>

              <div className={`p-3 rounded-lg border-2 ${privateMode ? "bg-zinc-900/50 border-amber-500/20" : "bg-amber-50 border-amber-200"}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Zap className={`w-4 h-4 ${privateMode ? "text-amber-400" : "text-amber-600"}`} />
                  <span className={`text-sm font-bold ${privateMode ? "text-amber-400" : "text-amber-700"}`}>
                    Bounty: $15,000
                  </span>
                </div>
                <p className={`text-xs ${privateMode ? "text-amber-400/60" : "text-amber-700/70"}`}>
                  MPC-powered confidential tokens with programmable privacy and DeFi composability.
                </p>
              </div>
            </motion.div>
          )}

          {activeTab === "activity" && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className={`text-sm font-bold uppercase ${privateMode ? "text-[#10B981]/60 font-mono" : "text-gray-500"}`}>
                  Privacy Activity Log
                </h3>
                <span className={`text-xs ${privateMode ? "text-[#10B981]/40" : "text-gray-400"}`}>
                  Session only
                </span>
              </div>

              {activity.length === 0 ? (
                <div className={`text-center py-8 rounded-lg border-2 border-dashed ${
                  privateMode ? "border-[#10B981]/30 text-[#10B981]/40" : "border-gray-300 text-gray-400"
                }`}>
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-mono">No activity yet</p>
                  <p className="text-xs mt-1">Test the privacy features to see activity here</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {activity.map(item => (
                    <div 
                      key={item.id}
                      className={`p-3 rounded-lg border-2 ${
                        privateMode ? "bg-zinc-900/50 border-[#10B981]/20" : "bg-white border-gray-200"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {item.status === "success" ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : item.status === "pending" ? (
                            <Clock className="w-4 h-4 text-yellow-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded ${
                            item.type === "shadowwire" 
                              ? privateMode ? "bg-purple-900 text-purple-300" : "bg-purple-100 text-purple-700"
                              : item.type === "stealth"
                                ? privateMode ? "bg-green-900 text-green-300" : "bg-green-100 text-green-700"
                                : item.type === "token2022"
                                  ? privateMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"
                                  : privateMode ? "bg-gray-800 text-gray-300" : "bg-gray-100 text-gray-700"
                          }`}>
                            {item.type}
                          </span>
                        </div>
                        <span className={`text-xs ${privateMode ? "text-[#10B981]/40" : "text-gray-400"}`}>
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className={`text-sm mt-2 ${privateMode ? "text-white" : "text-gray-700"}`}>
                        {item.description}
                      </p>
                      {item.amount && (
                        <p className={`text-xs mt-1 font-mono ${privateMode ? "text-[#10B981]/60" : "text-gray-500"}`}>
                          Amount: {item.amount} {item.token}
                        </p>
                      )}
                      {item.txSignature && (
                        <a
                          href={`https://solscan.io/tx/${item.txSignature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`inline-flex items-center gap-1 text-xs mt-2 ${
                            privateMode ? "text-[#10B981] hover:underline" : "text-purple-600 hover:underline"
                          }`}
                        >
                          View on Solscan <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className={`p-3 border-t-2 ${privateMode ? "border-[#10B981]/30 bg-zinc-900/50" : "border-gray-200 bg-gray-50"}`}>
        <div className="flex flex-wrap gap-2">
          {integrations.slice(0, 5).map(integration => (
            <div 
              key={integration.name}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono ${
                integration.available
                  ? privateMode ? "bg-green-900/50 text-green-400" : "bg-green-100 text-green-700"
                  : privateMode ? "bg-red-900/50 text-red-400" : "bg-red-100 text-red-700"
              }`}
            >
              {integration.available ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
              {integration.name.split(" ")[0]}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
