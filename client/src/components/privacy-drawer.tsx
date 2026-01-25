import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Shield, Check, Clock, AlertCircle, Terminal, Lock, Cpu } from "lucide-react";
import { usePrivacy } from "@/lib/privacy-context";

interface PrivacyIntegration {
  name: string;
  available: boolean;
  programId: string;
  network: string;
  description: string;
  implementation: string;
  note?: string;
}

interface PrivacyStatus {
  success: boolean;
  activeFeatures: string[];
  plannedFeatures: string[];
  integrations: PrivacyIntegration[];
}

export function PrivacyDrawer({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { privateMode, togglePrivateMode } = usePrivacy();
  const [status, setStatus] = useState<PrivacyStatus | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && !status) {
      setLoading(true);
      fetch("/api/privacy/status")
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setStatus(data);
          }
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [isOpen, status]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={`absolute inset-0 backdrop-blur-sm ${privateMode ? "bg-black/90" : "bg-black/80"}`}
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`absolute right-0 top-0 h-full w-full max-w-md shadow-xl overflow-y-auto ${
          privateMode 
            ? "bg-black border-l border-[#10B981]/30" 
            : "bg-white border-l-2 border-black"
        }`}
      >
        {privateMode && (
          <div className="absolute inset-0 pointer-events-none opacity-[0.02]" style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(57,255,20,0.3) 2px, rgba(57,255,20,0.3) 4px)`
          }} />
        )}
        
        <div className="p-6 relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${privateMode ? "border border-[#10B981]/50" : "bg-gray-100 rounded-lg"}`}>
                <Terminal className={`w-6 h-6 ${privateMode ? "text-[#10B981]" : "text-gray-700"}`} />
              </div>
              <div>
                <h2 className={`text-xl font-black font-mono ${privateMode ? "text-[#10B981]" : "text-gray-900"}`}>
                  {privateMode ? "// ENCRYPTION" : "Privacy Mode"}
                </h2>
                <p className={`text-sm font-mono ${privateMode ? "text-[#10B981]/50" : "text-gray-500"}`}>
                  {privateMode ? "[ SECURE CHANNEL ACTIVE ]" : "Trading publicly"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 transition-colors ${privateMode ? "text-[#10B981]/50 hover:text-[#10B981]" : "hover:bg-gray-100 rounded-lg text-gray-600"}`}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={togglePrivateMode}
            className={`w-full py-4 px-6 font-black font-mono text-lg border-2 mb-8 transition-all ${
              privateMode
                ? "bg-black border-[#10B981] text-[#10B981] hover:shadow-[0_0_20px_rgba(57,255,20,0.3)]"
                : "bg-gray-100 border-black text-gray-900 hover:bg-gray-200 rounded-lg shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]"
            }`}
            data-testid="button-toggle-privacy-full"
          >
            {privateMode ? "> TERMINATE_ENCRYPTION" : "ENABLE STEALTH MODE"}
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className={`animate-spin w-8 h-8 border-2 rounded-full ${
                privateMode ? "border-[#10B981] border-t-transparent" : "border-violet-500 border-t-transparent"
              }`} />
            </div>
          ) : status ? (
            <div className="space-y-6">
              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 font-mono ${
                  privateMode ? "text-[#10B981]" : "text-green-600"
                }`}>
                  <Check className="w-4 h-4" /> {privateMode ? "// ACTIVE_PROTOCOLS" : "Active Features"}
                </h3>
                <div className="space-y-2">
                  {status.activeFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className={`p-3 border ${
                        privateMode
                          ? "bg-black border-[#10B981]/30"
                          : "bg-green-50 border-green-200 rounded-lg"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${privateMode ? "text-[#10B981]" : "text-green-600"}`} />
                        <span className={`font-bold font-mono ${privateMode ? "text-[#10B981]/80" : "text-gray-800"}`}>
                          {privateMode ? `> ${feature.toUpperCase().replace(/ /g, '_')}` : feature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 font-mono ${
                  privateMode ? "text-[#F6C90E]" : "text-yellow-600"
                }`}>
                  <Clock className="w-4 h-4" /> {privateMode ? "// PENDING_MODULES" : "Coming Soon"}
                </h3>
                <div className="space-y-2">
                  {status.plannedFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className={`p-3 border ${
                        privateMode
                          ? "bg-black/50 border-[#F6C90E]/20"
                          : "bg-yellow-50 border-yellow-200 rounded-lg"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Lock className={`w-4 h-4 ${privateMode ? "text-[#F6C90E]/70" : "text-yellow-600"}`} />
                        <span className={`font-medium font-mono ${privateMode ? "text-[#F6C90E]/50" : "text-gray-600"}`}>
                          {privateMode ? `// ${feature.toUpperCase().replace(/ /g, '_')}` : feature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 font-mono ${
                  privateMode ? "text-[#00FFF0]" : "text-blue-600"
                }`}>
                  <Cpu className="w-4 h-4" /> {privateMode ? "// SDK_MODULES" : "SDK Integrations"}
                </h3>
                <div className="space-y-3">
                  {status.integrations.map((integration, i) => (
                    <div
                      key={i}
                      className={`p-4 border ${
                        privateMode
                          ? "bg-black border-[#00FFF0]/20"
                          : "bg-gray-50 border-gray-200 rounded-lg"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold font-mono ${privateMode ? "text-[#00FFF0]/80" : "text-gray-800"}`}>
                          {privateMode ? `> ${integration.name.split(' ')[0].toUpperCase()}` : integration.name}
                        </span>
                        <span className={`text-xs px-2 py-1 font-mono ${
                          integration.available
                            ? privateMode ? "bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/30" : "bg-green-100 text-green-700 rounded"
                            : privateMode ? "bg-[#F6C90E]/10 text-[#F6C90E] border border-[#F6C90E]/30" : "bg-yellow-100 text-yellow-700 rounded"
                        }`}>
                          {integration.available ? (privateMode ? "ONLINE" : "READY") : (privateMode ? "OFFLINE" : "PENDING")}
                        </span>
                      </div>
                      <p className={`text-sm mb-2 font-mono ${privateMode ? "text-[#00FFF0]/40" : "text-gray-600"}`}>
                        {integration.description}
                      </p>
                      <div className={`text-xs font-mono ${privateMode ? "text-[#00FFF0]/30" : "text-gray-400"}`}>
                        {privateMode ? `[${integration.network.toUpperCase()}] :: ${integration.implementation}` : `${integration.network} • ${integration.implementation}`}
                      </div>
                      {integration.note && (
                        <div className={`mt-2 text-xs flex items-start gap-1 font-mono ${
                          privateMode ? "text-[#FF1744]/70" : "text-orange-600"
                        }`}>
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {privateMode ? `! ${integration.note}` : integration.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {privateMode && (
                <div className="mt-8 pt-6 border-t border-[#10B981]/20">
                  <div className="font-mono text-xs text-[#10B981]/30 space-y-1">
                    <p>// ENCRYPTION: AES-256-GCM</p>
                    <p>// NETWORK: SOLANA_DEVNET</p>
                    <p>// STATUS: ALL_SYSTEMS_NOMINAL</p>
                    <motion.p
                      animate={{ opacity: [0.3, 0.6, 0.3] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                    >
                      █ SECURE CONNECTION ESTABLISHED
                    </motion.p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className={`text-center py-8 font-mono ${privateMode ? "text-[#FF1744]" : "text-gray-400"}`}>
              {privateMode ? "! CONNECTION_FAILED" : "Failed to load privacy status"}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
