import { useQuery } from "@tanstack/react-query";
import { Shield, Lock, Eye, Zap } from "lucide-react";
import { motion } from "framer-motion";

interface PrivacyStatus {
  platform: string;
  hackathon: string;
  network: string;
  privacyFeatures: {
    heliusRpc: boolean;
    confidentialBetting: boolean;
    anonymousTokenCreation: boolean;
    privateBalances: string;
    zkProofs: string;
  };
  rpcProvider: string;
  tracks: string[];
  bounties: string[];
}

export function PrivacyBadge() {
  const { data: privacyStatus } = useQuery<PrivacyStatus>({
    queryKey: ["privacy-status"],
    queryFn: async () => {
      const response = await fetch("/api/privacy/status");
      if (!response.ok) throw new Error("Failed to fetch privacy status");
      return response.json();
    },
    staleTime: 60000,
  });

  if (!privacyStatus) return null;

  const activeFeatures = Object.entries(privacyStatus.privacyFeatures).filter(
    ([_, value]) => value === true
  ).length;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 bg-green-100 border-2 border-green-500 rounded-lg"
      data-testid="privacy-badge"
    >
      <Shield className="w-4 h-4 text-green-600" />
      <span className="text-sm font-bold text-green-700">
        {activeFeatures} Privacy Features Active
      </span>
      <span className="text-xs text-green-600">
        ({privacyStatus.rpcProvider})
      </span>
    </motion.div>
  );
}

export function PrivacyStatusPanel() {
  const { data: privacyStatus, isLoading } = useQuery<PrivacyStatus>({
    queryKey: ["privacy-status"],
    queryFn: async () => {
      const response = await fetch("/api/privacy/status");
      if (!response.ok) throw new Error("Failed to fetch privacy status");
      return response.json();
    },
    staleTime: 60000,
  });

  if (isLoading) {
    return (
      <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-6 animate-pulse">
        <div className="h-6 bg-zinc-800 rounded w-1/3 mb-4"></div>
        <div className="space-y-2">
          <div className="h-4 bg-zinc-800 rounded w-full"></div>
          <div className="h-4 bg-zinc-800 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!privacyStatus) return null;

  const features = [
    {
      name: "Helius RPC",
      status: privacyStatus.privacyFeatures.heliusRpc,
      icon: Zap,
      description: "Secure, high-performance blockchain access",
    },
    {
      name: "Confidential Betting",
      status: privacyStatus.privacyFeatures.confidentialBetting,
      icon: Lock,
      description: "Bets stored privately in encrypted database",
    },
    {
      name: "Anonymous Token Creation",
      status: privacyStatus.privacyFeatures.anonymousTokenCreation,
      icon: Eye,
      description: "Create tokens without revealing wallet",
    },
    {
      name: "Private Balances (Token-2022)",
      status: privacyStatus.privacyFeatures.privateBalances === "planned" ? "planned" : privacyStatus.privacyFeatures.privateBalances,
      icon: Shield,
      description: "Encrypted token balances on-chain",
    },
    {
      name: "ZK Proofs (Noir)",
      status: privacyStatus.privacyFeatures.zkProofs === "planned" ? "planned" : privacyStatus.privacyFeatures.zkProofs,
      icon: Lock,
      description: "Zero-knowledge betting verification",
    },
  ];

  return (
    <div className="bg-zinc-900 border-2 border-zinc-700 rounded-xl p-6" data-testid="privacy-status-panel">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-green-500/20 rounded-lg">
          <Shield className="w-6 h-6 text-green-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Privacy Stack Status</h3>
          <p className="text-sm text-zinc-400">{privacyStatus.hackathon}</p>
        </div>
      </div>

      <div className="grid gap-3">
        {features.map((feature) => (
          <div
            key={feature.name}
            className="flex items-center justify-between p-3 bg-zinc-800 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <feature.icon className="w-4 h-4 text-zinc-400" />
              <div>
                <p className="text-sm font-medium text-white">{feature.name}</p>
                <p className="text-xs text-zinc-500">{feature.description}</p>
              </div>
            </div>
            <div>
              {feature.status === true ? (
                <span className="px-2 py-1 text-xs font-bold bg-green-500/20 text-green-400 rounded">
                  ACTIVE
                </span>
              ) : feature.status === "planned" ? (
                <span className="px-2 py-1 text-xs font-bold bg-yellow-500/20 text-yellow-400 rounded">
                  PLANNED
                </span>
              ) : (
                <span className="px-2 py-1 text-xs font-bold bg-zinc-700 text-zinc-400 rounded">
                  INACTIVE
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-zinc-700">
        <p className="text-xs text-zinc-500">
          Network: <span className="text-green-400 font-medium">{privacyStatus.network}</span> | 
          RPC: <span className="text-green-400 font-medium">{privacyStatus.rpcProvider}</span>
        </p>
      </div>
    </div>
  );
}
