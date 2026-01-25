import { useState, useEffect } from "react";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, ArrowDownToLine, ArrowUpFromLine, Key, Copy, Check, RefreshCw, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

export function PrivacyWallet() {
  const { connectedWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const { toast } = useToast();
  
  const [shadowWireBalance, setShadowWireBalance] = useState<PrivateBalance>({ sol: 0, usdc: 0, loading: true });
  const [privacyCashBalance, setPrivacyCashBalance] = useState<PrivateBalance>({ sol: 0, usdc: 0, loading: true });
  const [stealthAddresses, setStealthAddresses] = useState<StealthAddress[]>([]);
  const [showBalances, setShowBalances] = useState(false);
  const [depositModal, setDepositModal] = useState(false);
  const [withdrawModal, setWithdrawModal] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (connectedWallet) {
      fetchBalances();
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
          sol: swData.balances?.SOL || 0, 
          usdc: swData.balances?.USDC || 0, 
          loading: false 
        });
      } else {
        setShadowWireBalance({ sol: 0, usdc: 0, loading: false });
      }
      
      if (pcRes.ok) {
        const pcData = await pcRes.json();
        setPrivacyCashBalance({ 
          sol: pcData.balance?.sol || 0, 
          usdc: pcData.balance?.usdc || 0, 
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

  const generateStealthAddress = async () => {
    if (!connectedWallet) return;
    
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
      }
    } catch (error) {
      toast({
        title: "Failed to generate stealth address",
        variant: "destructive",
      });
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
          wallet: connectedWallet, 
          amount: parseFloat(depositAmount),
          token: "SOL"
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        toast({
          title: "Private Deposit Initiated",
          description: `Depositing ${depositAmount} SOL privately`,
        });
        setDepositModal(false);
        setDepositAmount("");
        fetchBalances();
      }
    } catch (error) {
      toast({
        title: "Deposit failed",
        variant: "destructive",
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
          wallet: connectedWallet, 
          amount: parseFloat(withdrawAmount),
          token: "SOL"
        })
      });
      
      if (res.ok) {
        toast({
          title: "Private Withdrawal Initiated",
          description: `Withdrawing ${withdrawAmount} SOL privately`,
        });
        setWithdrawModal(false);
        setWithdrawAmount("");
        fetchBalances();
      }
    } catch (error) {
      toast({
        title: "Withdrawal failed",
        variant: "destructive",
      });
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

  const totalPrivateSOL = shadowWireBalance.sol + privacyCashBalance.sol;
  const totalPrivateUSDC = shadowWireBalance.usdc + privacyCashBalance.usdc;

  return (
    <div className={`border-2 border-black rounded-xl p-6 space-y-5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
      privateMode ? "bg-black border-[#39FF14]" : "bg-gradient-to-br from-purple-100 to-indigo-100"
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-purple-600"}`} />
          <h2 className={`text-lg font-black uppercase ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
            {privateMode ? "PRIVATE_VAULT" : "Privacy Wallet"}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <motion.button
            onClick={() => setShowBalances(!showBalances)}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-lg transition-colors ${
              privateMode ? "text-[#39FF14] hover:bg-[#39FF14]/10" : "text-gray-600 hover:bg-gray-200"
            }`}
            data-testid="button-toggle-balance-visibility"
          >
            {showBalances ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </motion.button>
          <motion.button
            onClick={fetchBalances}
            whileHover={{ scale: 1.1, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            className={`p-2 rounded-lg transition-colors ${
              privateMode ? "text-[#39FF14] hover:bg-[#39FF14]/10" : "text-gray-600 hover:bg-gray-200"
            }`}
            data-testid="button-refresh-balances"
          >
            <RefreshCw className="w-4 h-4" />
          </motion.button>
        </div>
      </div>

      <div className={`grid grid-cols-2 gap-3 p-4 rounded-lg border-2 ${
        privateMode ? "bg-zinc-900/50 border-[#39FF14]/30" : "bg-white/50 border-gray-200"
      }`}>
        <div>
          <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-500"}`}>
            {privateMode ? "SHIELDED_SOL" : "Private SOL"}
          </p>
          <p className={`text-2xl font-mono font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
            {shadowWireBalance.loading || privacyCashBalance.loading ? "..." : formatBalance(totalPrivateSOL)}
          </p>
        </div>
        <div>
          <p className={`text-xs font-bold uppercase mb-1 ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-500"}`}>
            {privateMode ? "SHIELDED_USDC" : "Private USDC"}
          </p>
          <p className={`text-2xl font-mono font-black ${privateMode ? "text-white" : "text-gray-900"}`}>
            {shadowWireBalance.loading || privacyCashBalance.loading ? "..." : formatBalance(totalPrivateUSDC)}
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <motion.button
          onClick={() => setDepositModal(true)}
          whileHover={{ y: -2, x: -2 }}
          whileTap={{ y: 0, x: 0 }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
            privateMode 
              ? "bg-[#39FF14] text-black hover:bg-[#39FF14]/80" 
              : "bg-purple-500 text-white hover:bg-purple-600"
          }`}
          data-testid="button-private-deposit"
        >
          <ArrowDownToLine className="w-4 h-4" />
          {privateMode ? "DEPOSIT" : "Private Deposit"}
        </motion.button>
        <motion.button
          onClick={() => setWithdrawModal(true)}
          whileHover={{ y: -2, x: -2 }}
          whileTap={{ y: 0, x: 0 }}
          className={`flex-1 flex items-center justify-center gap-2 py-3 font-bold text-sm uppercase rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all ${
            privateMode 
              ? "bg-black border-[#39FF14] text-[#39FF14] hover:bg-[#39FF14]/10" 
              : "bg-white text-purple-600 hover:bg-gray-100"
          }`}
          data-testid="button-private-withdraw"
        >
          <ArrowUpFromLine className="w-4 h-4" />
          {privateMode ? "WITHDRAW" : "Private Withdraw"}
        </motion.button>
      </div>

      <div className={`border-t-2 pt-4 ${privateMode ? "border-[#39FF14]/30" : "border-gray-200"}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Key className={`w-4 h-4 ${privateMode ? "text-[#39FF14]" : "text-purple-600"}`} />
            <span className={`text-sm font-bold uppercase ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-500"}`}>
              {privateMode ? "STEALTH_ADDRS" : "Stealth Addresses"}
            </span>
          </div>
          <motion.button
            onClick={generateStealthAddress}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-3 py-1 text-xs font-bold uppercase rounded-lg border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
              privateMode 
                ? "bg-[#39FF14] text-black" 
                : "bg-purple-400 text-white"
            }`}
            data-testid="button-generate-stealth"
          >
            {privateMode ? "+ NEW" : "+ Generate"}
          </motion.button>
        </div>
        
        <p className={`text-xs mb-3 ${privateMode ? "text-[#39FF14]/40 font-mono" : "text-gray-500"}`}>
          {privateMode 
            ? "// ONE_TIME_ADDRS_FOR_UNLINKABLE_TRANSFERS" 
            : "Use these one-time addresses to receive tokens privately. Each address can only be used once."}
        </p>

        {stealthAddresses.length === 0 ? (
          <div className={`text-center py-4 rounded-lg border-2 border-dashed ${
            privateMode ? "border-[#39FF14]/30 text-[#39FF14]/40" : "border-gray-300 text-gray-400"
          }`}>
            <Lock className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-mono">
              {privateMode ? "NO_STEALTH_ADDRS_YET" : "No stealth addresses generated"}
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stealthAddresses.map((stealth, i) => (
              <div 
                key={stealth.address}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  privateMode ? "bg-zinc-900/50 border-[#39FF14]/20" : "bg-white border-gray-200"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`font-mono text-xs truncate ${privateMode ? "text-white" : "text-gray-700"}`}>
                    {stealth.address.slice(0, 20)}...{stealth.address.slice(-8)}
                  </p>
                  <p className={`text-[10px] ${privateMode ? "text-[#39FF14]/40" : "text-gray-400"}`}>
                    View tag: {stealth.viewTag}
                  </p>
                </div>
                <motion.button
                  onClick={() => copyToClipboard(stealth.address, stealth.address)}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={`p-1.5 rounded ${privateMode ? "text-[#39FF14] hover:bg-[#39FF14]/10" : "text-gray-500 hover:bg-gray-100"}`}
                  data-testid={`button-copy-stealth-${i}`}
                >
                  {copied === stealth.address ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </motion.button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {depositModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setDepositModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-zinc-900 border-[#39FF14]" : "bg-white"
              }`}
            >
              <h3 className={`text-xl font-black mb-4 ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
                {privateMode ? "PRIVATE_DEPOSIT" : "Private Deposit"}
              </h3>
              <p className={`text-sm mb-4 ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-600"}`}>
                {privateMode 
                  ? "// ZK_PROOF_BREAKS_ONCHAIN_LINK" 
                  : "Your deposit will be hidden using zero-knowledge proofs, breaking the link between your public wallet and private balance."}
              </p>
              <input
                type="number"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="Amount in SOL"
                className={`w-full px-4 py-3 rounded-lg border-2 border-black mb-4 font-mono ${
                  privateMode ? "bg-black text-white border-[#39FF14]/50" : "bg-gray-100"
                }`}
                data-testid="input-deposit-amount"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setDepositModal(false)}
                  className={`flex-1 py-3 font-bold rounded-lg border-2 border-black ${
                    privateMode ? "bg-black text-white" : "bg-gray-200"
                  }`}
                  data-testid="button-cancel-deposit"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeposit}
                  disabled={processing || !depositAmount}
                  className={`flex-1 py-3 font-bold rounded-lg border-2 border-black ${
                    privateMode ? "bg-[#39FF14] text-black" : "bg-purple-500 text-white"
                  } disabled:opacity-50`}
                  data-testid="button-confirm-deposit"
                >
                  {processing ? "Processing..." : "Deposit"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {withdrawModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setWithdrawModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className={`w-full max-w-md p-6 rounded-xl border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] ${
                privateMode ? "bg-zinc-900 border-[#39FF14]" : "bg-white"
              }`}
            >
              <h3 className={`text-xl font-black mb-4 ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
                {privateMode ? "PRIVATE_WITHDRAW" : "Private Withdraw"}
              </h3>
              <p className={`text-sm mb-4 ${privateMode ? "text-[#39FF14]/60 font-mono" : "text-gray-600"}`}>
                {privateMode 
                  ? "// ANONYMOUS_EXIT_TO_ANY_WALLET" 
                  : "Withdraw to any wallet anonymously. The receiving wallet cannot be linked to your private balance."}
              </p>
              <input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                placeholder="Amount in SOL"
                className={`w-full px-4 py-3 rounded-lg border-2 border-black mb-4 font-mono ${
                  privateMode ? "bg-black text-white border-[#39FF14]/50" : "bg-gray-100"
                }`}
                data-testid="input-withdraw-amount"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setWithdrawModal(false)}
                  className={`flex-1 py-3 font-bold rounded-lg border-2 border-black ${
                    privateMode ? "bg-black text-white" : "bg-gray-200"
                  }`}
                  data-testid="button-cancel-withdraw"
                >
                  Cancel
                </button>
                <button
                  onClick={handleWithdraw}
                  disabled={processing || !withdrawAmount}
                  className={`flex-1 py-3 font-bold rounded-lg border-2 border-black ${
                    privateMode ? "bg-[#39FF14] text-black" : "bg-purple-500 text-white"
                  } disabled:opacity-50`}
                  data-testid="button-confirm-withdraw"
                >
                  {processing ? "Processing..." : "Withdraw"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
