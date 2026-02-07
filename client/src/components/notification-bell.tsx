import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle, XCircle, Clock, Trophy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Link } from "wouter";
import { useWallet } from "@/lib/wallet-context";
import { usePrivacy } from "@/lib/privacy-context";

interface Notification {
  id: string;
  type: "market_resolved" | "market_expiring_soon";
  marketId: string;
  question: string;
  outcome?: string;
  won?: boolean;
  betAmount?: number;
  payout?: number;
  resolvedAt?: string;
  minutesLeft?: number;
}

export function NotificationBell() {
  const { connectedWallet } = useWallet();
  const { privateMode } = usePrivacy();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data } = useQuery<{ notifications: Notification[] }>({
    queryKey: ["notifications", connectedWallet],
    queryFn: async () => {
      const res = await fetch(`/api/notifications/${connectedWallet}`);
      if (!res.ok) return { notifications: [] };
      return res.json();
    },
    enabled: !!connectedWallet,
    refetchInterval: 30000,
  });

  const notifications = (data?.notifications || []).filter(n => !dismissed.has(n.id));
  const unreadCount = notifications.length;

  if (!connectedWallet) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`relative p-2 rounded-lg transition-colors ${
          privateMode
            ? "text-[#4ADE80] hover:bg-[#4ADE80]/10"
            : "text-gray-600 hover:bg-gray-100"
        }`}
        data-testid="button-notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className={`absolute right-0 top-full mt-2 w-80 max-h-96 overflow-y-auto rounded-xl border-2 shadow-xl z-50 ${
                privateMode
                  ? "bg-black border-[#4ADE80]/30"
                  : "bg-white border-black"
              }`}
              data-testid="dropdown-notifications"
            >
              <div className={`p-3 border-b ${privateMode ? "border-[#4ADE80]/20" : "border-gray-200"}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`font-bold text-sm ${privateMode ? "text-[#4ADE80]" : "text-gray-900"}`}>
                    {privateMode ? "> ALERTS" : "Notifications"}
                  </h3>
                  <button onClick={() => setOpen(false)} className={`p-1 rounded ${privateMode ? "text-[#4ADE80]/50 hover:text-[#4ADE80]" : "text-gray-400 hover:text-gray-600"}`}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className={`p-6 text-center text-sm ${privateMode ? "text-[#4ADE80]/40" : "text-gray-400"}`}>
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-zinc-800">
                  {notifications.map((notif) => (
                    <Link key={notif.id} href={`/market/${notif.marketId}`}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setOpen(false)}
                        className={`p-3 cursor-pointer transition-colors ${
                          privateMode ? "hover:bg-[#4ADE80]/5" : "hover:bg-gray-50"
                        }`}
                        data-testid={`notification-${notif.id}`}
                      >
                        {notif.type === "market_resolved" ? (
                          <div className="flex gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                              notif.won ? "bg-green-500/20" : "bg-red-500/20"
                            }`}>
                              {notif.won ? (
                                <Trophy className="w-4 h-4 text-green-400" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-bold ${notif.won ? "text-green-400" : "text-red-400"}`}>
                                {notif.won ? "You won!" : "Market resolved"}
                              </p>
                              <p className={`text-xs truncate mt-0.5 ${privateMode ? "text-white" : "text-gray-700"}`}>
                                {notif.question}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                  notif.outcome === "yes" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"
                                }`}>
                                  {notif.outcome?.toUpperCase()}
                                </span>
                                {notif.won && notif.payout && (
                                  <span className="text-[10px] text-green-400 font-bold">
                                    +{notif.payout.toFixed(2)} SOL
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setDismissed(prev => { const next = new Set(prev); next.add(notif.id); return next; });
                              }}
                              className={`p-1 rounded self-start ${privateMode ? "text-[#4ADE80]/30 hover:text-[#4ADE80]" : "text-gray-300 hover:text-gray-500"}`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-3">
                            <div className="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center flex-shrink-0">
                              <Clock className="w-4 h-4 text-yellow-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-yellow-400">Expiring soon</p>
                              <p className={`text-xs truncate mt-0.5 ${privateMode ? "text-white" : "text-gray-700"}`}>
                                {notif.question}
                              </p>
                              <p className="text-[10px] text-yellow-400/70 mt-1">
                                {notif.minutesLeft}m remaining
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    </Link>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
