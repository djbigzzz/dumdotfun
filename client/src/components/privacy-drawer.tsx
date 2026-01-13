import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shield, Check, Clock, AlertCircle, Ghost, Lock, Eye } from "lucide-react";
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
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className={`absolute right-0 top-0 h-full w-full max-w-md ${
          privateMode ? "bg-zinc-900" : "bg-white"
        } border-l-2 border-black shadow-xl overflow-y-auto`}
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${privateMode ? "bg-violet-600" : "bg-gray-100"}`}>
                <Ghost className={`w-6 h-6 ${privateMode ? "text-white" : "text-gray-700"}`} />
              </div>
              <div>
                <h2 className={`text-xl font-black ${privateMode ? "text-violet-400" : "text-gray-900"}`}>
                  Privacy Mode
                </h2>
                <p className={`text-sm ${privateMode ? "text-gray-400" : "text-gray-500"}`}>
                  {privateMode ? "Stealth trading enabled" : "Trading publicly"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className={`p-2 rounded-lg ${privateMode ? "hover:bg-zinc-800" : "hover:bg-gray-100"}`}
            >
              <X className={`w-5 h-5 ${privateMode ? "text-gray-400" : "text-gray-600"}`} />
            </button>
          </div>

          <button
            onClick={togglePrivateMode}
            className={`w-full py-4 px-6 font-black text-lg border-2 border-black rounded-lg mb-8 transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] ${
              privateMode
                ? "bg-violet-600 text-white"
                : "bg-gray-100 text-gray-900 hover:bg-gray-200"
            }`}
            data-testid="button-toggle-privacy-full"
          >
            {privateMode ? "DISABLE STEALTH MODE" : "ENABLE STEALTH MODE"}
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full" />
            </div>
          ) : status ? (
            <div className="space-y-6">
              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 ${
                  privateMode ? "text-green-400" : "text-green-600"
                }`}>
                  <Check className="w-4 h-4" /> Active Features
                </h3>
                <div className="space-y-2">
                  {status.activeFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        privateMode
                          ? "bg-zinc-800 border-zinc-700"
                          : "bg-green-50 border-green-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Shield className={`w-4 h-4 ${privateMode ? "text-green-400" : "text-green-600"}`} />
                        <span className={`font-bold ${privateMode ? "text-gray-200" : "text-gray-800"}`}>
                          {feature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 ${
                  privateMode ? "text-yellow-400" : "text-yellow-600"
                }`}>
                  <Clock className="w-4 h-4" /> Coming Soon
                </h3>
                <div className="space-y-2">
                  {status.plannedFeatures.map((feature, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border ${
                        privateMode
                          ? "bg-zinc-800/50 border-zinc-700"
                          : "bg-yellow-50 border-yellow-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Lock className={`w-4 h-4 ${privateMode ? "text-yellow-400" : "text-yellow-600"}`} />
                        <span className={`font-medium ${privateMode ? "text-gray-400" : "text-gray-600"}`}>
                          {feature}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className={`text-sm font-black uppercase mb-3 flex items-center gap-2 ${
                  privateMode ? "text-cyan-400" : "text-blue-600"
                }`}>
                  <Eye className="w-4 h-4" /> SDK Integrations
                </h3>
                <div className="space-y-3">
                  {status.integrations.map((integration, i) => (
                    <div
                      key={i}
                      className={`p-4 rounded-lg border ${
                        privateMode
                          ? "bg-zinc-800 border-zinc-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className={`font-bold ${privateMode ? "text-gray-200" : "text-gray-800"}`}>
                          {integration.name}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded font-mono ${
                          integration.available
                            ? privateMode ? "bg-green-900 text-green-400" : "bg-green-100 text-green-700"
                            : privateMode ? "bg-yellow-900 text-yellow-400" : "bg-yellow-100 text-yellow-700"
                        }`}>
                          {integration.available ? "READY" : "PENDING"}
                        </span>
                      </div>
                      <p className={`text-sm mb-2 ${privateMode ? "text-gray-400" : "text-gray-600"}`}>
                        {integration.description}
                      </p>
                      <div className={`text-xs font-mono ${privateMode ? "text-gray-500" : "text-gray-400"}`}>
                        {integration.network} • {integration.implementation}
                      </div>
                      {integration.note && (
                        <div className={`mt-2 text-xs flex items-start gap-1 ${
                          privateMode ? "text-orange-400" : "text-orange-600"
                        }`}>
                          <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {integration.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className={`text-center py-8 ${privateMode ? "text-gray-500" : "text-gray-400"}`}>
              Failed to load privacy status
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
