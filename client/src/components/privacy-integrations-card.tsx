import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Lock, Zap, Eye, ChevronDown, ChevronUp, ExternalLink, DollarSign } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

interface Integration {
  name: string;
  available: boolean;
  programId?: string;
  network: string;
  description: string;
  implementation: string;
  version?: string;
  bounty?: string;
  features?: string[];
}

interface PrivacyStatusResponse {
  success: boolean;
  integrations: Integration[];
  hackathonBounties?: Record<string, { prize: string; status: string }>;
}

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
  
  const totalBounty = (() => {
    if (!status?.integrations) return "$0";
    let total = 0;
    status.integrations.forEach(i => {
      if (i.bounty) {
        const match = i.bounty.match(/\$?([\d,]+)/);
        if (match) {
          total += parseInt(match[1].replace(/,/g, ''), 10);
        }
      }
    });
    if (total >= 1000) return `$${Math.floor(total / 1000)}K+`;
    return `$${total}`;
  })();

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

  if (!status) {
    return null;
  }

  if (activeIntegrations.length === 0) {
    return (
      <div className={`rounded-xl p-4 ${
        privateMode ? "bg-black/50 border border-[#39FF14]/20" : "bg-gray-100 border-2 border-gray-300"
      }`}>
        <div className="flex items-center gap-2">
          <Shield className={`w-4 h-4 ${privateMode ? "text-[#39FF14]/50" : "text-gray-400"}`} />
          <span className={`text-sm ${privateMode ? "text-[#39FF14]/50" : "text-gray-500"}`}>
            Privacy integrations loading...
          </span>
        </div>
      </div>
    );
  }

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
              {privateMode ? "// PRIVACY_STACK" : "Privacy Integrations"}
            </h3>
            <p className={`text-sm ${privateMode ? "text-[#39FF14]/50" : "text-gray-500"}`}>
              {activeIntegrations.length} active • {totalBounty} hackathon bounties
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-bold ${
            privateMode 
              ? "bg-[#39FF14]/20 text-[#39FF14] border border-[#39FF14]/30" 
              : "bg-green-100 text-green-700 border-2 border-black"
          }`}>
            LIVE
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
              {activeIntegrations.slice(0, compact ? 4 : undefined).map((integration, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg transition-all ${
                    privateMode 
                      ? "bg-black/50 border border-[#39FF14]/20 hover:border-[#39FF14]/40" 
                      : "bg-white border-2 border-gray-200 hover:border-black"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {integration.name.includes("Inco") && <Zap className={`w-4 h-4 ${privateMode ? "text-yellow-400" : "text-yellow-500"}`} />}
                      {integration.name.includes("Stealth") && <Eye className={`w-4 h-4 ${privateMode ? "text-cyan-400" : "text-cyan-500"}`} />}
                      {integration.name.includes("Token-2022") && <Lock className={`w-4 h-4 ${privateMode ? "text-purple-400" : "text-purple-500"}`} />}
                      {integration.name.includes("Privacy Cash") && <DollarSign className={`w-4 h-4 ${privateMode ? "text-green-400" : "text-green-500"}`} />}
                      {integration.name.includes("ShadowWire") && <Shield className={`w-4 h-4 ${privateMode ? "text-red-400" : "text-red-500"}`} />}
                      {integration.name.includes("NP Exchange") && <Zap className={`w-4 h-4 ${privateMode ? "text-blue-400" : "text-blue-500"}`} />}
                      <span className={`font-bold text-sm ${privateMode ? "text-[#39FF14]/90 font-mono" : "text-gray-800"}`}>
                        {privateMode ? integration.name.split(' ')[0].toUpperCase() : integration.name.split(' ').slice(0, 2).join(' ')}
                      </span>
                    </div>
                    {integration.bounty && (
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        privateMode ? "bg-yellow-500/20 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                      }`}>
                        {integration.bounty}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs line-clamp-2 ${privateMode ? "text-[#39FF14]/40" : "text-gray-500"}`}>
                    {integration.description}
                  </p>
                  {integration.version && (
                    <div className={`mt-2 text-xs font-mono ${privateMode ? "text-[#39FF14]/30" : "text-gray-400"}`}>
                      v{integration.version}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {!compact && status?.hackathonBounties && (
              <div className={`px-4 pb-4 pt-2 border-t ${privateMode ? "border-[#39FF14]/10" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-bold ${privateMode ? "text-[#39FF14]/50 font-mono" : "text-gray-500"}`}>
                    {privateMode ? "// SOLANA_PRIVACY_HACKATHON" : "Solana Privacy Hackathon - Feb 1 Deadline"}
                  </span>
                  <a
                    href="/docs"
                    className={`text-xs flex items-center gap-1 ${
                      privateMode ? "text-[#00FFF0] hover:text-[#00FFF0]/80" : "text-blue-500 hover:text-blue-600"
                    }`}
                  >
                    Learn more <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
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
