import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Zap, Eye, ChevronDown, ChevronUp, DollarSign, CheckCircle } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

interface Integration {
  name: string;
  available: boolean;
  programId?: string;
  network: string;
  description: string;
  implementation: string;
  version?: string;
  features?: string[];
}

interface PrivacyStatusResponse {
  success: boolean;
  integrations: Integration[];
}

const userFriendlyDescriptions: Record<string, { title: string; benefit: string }> = {
  "Inco Lightning": {
    title: "Confidential Betting",
    benefit: "Your bet amounts are encrypted and hidden from others"
  },
  "Stealth Addresses": {
    title: "Private Receiving",
    benefit: "Receive tokens without revealing your main wallet"
  },
  "Token-2022 Confidential": {
    title: "Hidden Balances",
    benefit: "Your token balances stay private on-chain"
  },
  "Privacy Cash": {
    title: "Private Transactions",
    benefit: "Deposit and withdraw without linking your wallets"
  },
  "ShadowWire": {
    title: "Anonymous Transfers",
    benefit: "Send tokens with hidden amounts and anonymous sender"
  },
  "NP Exchange": {
    title: "AI Markets",
    benefit: "Create prediction markets with AI assistance"
  }
};

export function PrivacyIntegrationsCard({ compact = false }: { compact?: boolean }) {
  const { privateMode } = usePrivacy();
  const [expanded, setExpanded] = useState(!compact);

  const { data: status, isLoading } = useQuery<PrivacyStatusResponse>({
    queryKey: ["privacy-status"],
    queryFn: async () => {
      const res = await fetch("/api/privacy/status");
      if (!res.ok) throw new Error("Failed to fetch privacy status");
      return res.json();
    },
    staleTime: 60000,
  });

  const activeIntegrations = status?.integrations?.filter(i => i.available) || [];

  if (isLoading) {
    return (
      <div className={`rounded-xl p-4 animate-pulse ${
        privateMode ? "bg-black/50 border border-[#39FF14]/20" : "bg-zinc-100 border-2 border-black"
      }`}>
        <div className="h-5 bg-zinc-300 rounded w-1/3 mb-2" />
        <div className="h-4 bg-zinc-300 rounded w-2/3" />
      </div>
    );
  }

  if (!status || activeIntegrations.length === 0) {
    return null;
  }

  const getIcon = (name: string) => {
    if (name.includes("Inco")) return <Zap className={`w-4 h-4 ${privateMode ? "text-yellow-400" : "text-yellow-500"}`} />;
    if (name.includes("Stealth")) return <Eye className={`w-4 h-4 ${privateMode ? "text-cyan-400" : "text-cyan-500"}`} />;
    if (name.includes("Token-2022")) return <Lock className={`w-4 h-4 ${privateMode ? "text-purple-400" : "text-purple-500"}`} />;
    if (name.includes("Privacy Cash")) return <DollarSign className={`w-4 h-4 ${privateMode ? "text-green-400" : "text-green-500"}`} />;
    if (name.includes("ShadowWire")) return <Shield className={`w-4 h-4 ${privateMode ? "text-red-400" : "text-red-500"}`} />;
    if (name.includes("NP Exchange")) return <Zap className={`w-4 h-4 ${privateMode ? "text-blue-400" : "text-blue-500"}`} />;
    return <Shield className={`w-4 h-4 ${privateMode ? "text-[#39FF14]" : "text-violet-500"}`} />;
  };

  const getFriendlyInfo = (name: string) => {
    for (const key of Object.keys(userFriendlyDescriptions)) {
      if (name.includes(key.split(' ')[0])) {
        return userFriendlyDescriptions[key];
      }
    }
    return { title: name, benefit: "" };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl overflow-hidden transition-all ${
        privateMode 
          ? "bg-black/80 border border-[#39FF14]/30 shadow-[0_0_15px_rgba(57,255,20,0.1)]" 
          : "bg-gradient-to-br from-violet-50 to-blue-50 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full p-4 flex items-center justify-between transition-colors ${
          privateMode ? "hover:bg-[#39FF14]/5" : "hover:bg-white/50"
        }`}
        data-testid="button-expand-privacy-card"
      >
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            privateMode ? "bg-[#39FF14]/10 border border-[#39FF14]/30" : "bg-violet-100 border-2 border-black"
          }`}>
            <Shield className={`w-5 h-5 ${privateMode ? "text-[#39FF14]" : "text-violet-600"}`} />
          </div>
          <div className="text-left">
            <h3 className={`font-bold ${privateMode ? "text-[#39FF14] font-mono" : "text-gray-900"}`}>
              {privateMode ? "// PRIVACY_FEATURES" : "Privacy Features"}
            </h3>
            <p className={`text-sm ${privateMode ? "text-[#39FF14]/50" : "text-gray-500"}`}>
              {activeIntegrations.length} features available
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            privateMode 
              ? "bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30" 
              : "bg-green-100 text-green-700 border-2 border-black"
          }`}>
            ACTIVE
          </span>
          {expanded ? (
            <ChevronUp className={`w-5 h-5 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`} />
          ) : (
            <ChevronDown className={`w-5 h-5 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`} />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 grid gap-3 ${compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2"}`}>
              {activeIntegrations.slice(0, compact ? 4 : undefined).map((integration, i) => {
                const friendlyInfo = getFriendlyInfo(integration.name);
                return (
                  <div
                    key={i}
                    className={`p-3 rounded-lg transition-all ${
                      privateMode 
                        ? "bg-black/50 border border-[#39FF14]/20 hover:border-[#39FF14]/40" 
                        : "bg-white border-2 border-gray-200 hover:border-black"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {getIcon(integration.name)}
                      <span className={`font-bold text-sm ${privateMode ? "text-[#39FF14]/90 font-mono" : "text-gray-800"}`}>
                        {friendlyInfo.title}
                      </span>
                      <CheckCircle className={`w-3.5 h-3.5 ml-auto ${privateMode ? "text-[#39FF14]" : "text-green-500"}`} />
                    </div>
                    <p className={`text-xs ${privateMode ? "text-[#39FF14]/50" : "text-gray-500"}`}>
                      {friendlyInfo.benefit || integration.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function PrivacyFeatureBadge({ feature, small = false }: { feature: string; small?: boolean }) {
  const { privateMode } = usePrivacy();
  
  const getIcon = () => {
    switch (feature.toLowerCase()) {
      case "inco": return <Zap className={small ? "w-3 h-3" : "w-4 h-4"} />;
      case "stealth": return <Eye className={small ? "w-3 h-3" : "w-4 h-4"} />;
      case "token2022": return <Lock className={small ? "w-3 h-3" : "w-4 h-4"} />;
      case "shadowwire": return <Shield className={small ? "w-3 h-3" : "w-4 h-4"} />;
      default: return <Shield className={small ? "w-3 h-3" : "w-4 h-4"} />;
    }
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded font-bold ${
      small ? "text-xs" : "text-sm"
    } ${
      privateMode 
        ? "bg-[#39FF14]/10 text-[#39FF14] border border-[#39FF14]/30" 
        : "bg-green-100 text-green-700 border border-green-300"
    }`}>
      {getIcon()}
      {feature}
    </span>
  );
}
