import { useQuery } from "@tanstack/react-query";
import { Bell, XCircle, Clock, Trophy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useWallet } from "@/lib/wallet-context";

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

// Persist dismissed notification IDs per wallet so "mark as read" survives a
// page refresh. Without this, every refresh re-shows the same items and the
// red dot never goes away - which is exactly the "messed up" symptom users
// report.
const dismissedKey = (wallet: string) => `notifications:dismissed:${wallet}`;

function loadDismissed(wallet: string | null): Set<string> {
  if (!wallet || typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(dismissedKey(wallet));
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(wallet: string | null, ids: Set<string>) {
  if (!wallet || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(dismissedKey(wallet), JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage quota or disabled - silently degrade to in-memory only.
  }
}

export function NotificationBell() {
  const { connectedWallet } = useWallet();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed(connectedWallet));

  // Re-hydrate the dismissed set when the active wallet changes (account
  // switch in Phantom, or fresh mount). Each wallet gets its own list.
  useEffect(() => {
    setDismissed(loadDismissed(connectedWallet));
  }, [connectedWallet]);

  const dismissOne = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      saveDismissed(connectedWallet, next);
      return next;
    });
  }, [connectedWallet]);

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
    <div className={`relative ${open ? "z-[100]" : ""}`}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100"
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
            <div className="fixed inset-0 z-[90]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] max-h-96 overflow-y-auto rounded-xl border-2 shadow-xl z-[100] bg-white border-black"
              data-testid="dropdown-notifications"
            >
              <div className="p-3 border-b border-gray-200">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-gray-900">
                    Notifications
                  </h3>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const all = new Set(dismissed);
                          notifications.forEach(n => all.add(n.id));
                          setDismissed(all);
                          saveDismissed(connectedWallet, all);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                        data-testid="button-clear-notifications"
                      >
                        Clear all
                      </button>
                    )}
                    <button onClick={() => setOpen(false)} className="p-1 rounded text-gray-400 hover:text-gray-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  No notifications
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((notif) => (
                      <motion.div
                        key={notif.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setOpen(false);
                          navigate(`/market/${notif.marketId}`);
                        }}
                        className="p-3 cursor-pointer transition-colors hover:bg-gray-50"
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
                              {notif.resolvedAt && (
                                <p className="text-[10px] text-gray-400 mt-0.5">
                                  {new Date(notif.resolvedAt).toLocaleDateString()}
                                </p>
                              )}
                              <p className="text-xs mt-0.5 text-gray-700 line-clamp-2 break-words">
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
                                dismissOne(notif.id);
                              }}
                              className="p-1 rounded self-start text-gray-300 hover:text-gray-500"
                              data-testid={`button-dismiss-${notif.id}`}
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
                              <p className="text-xs mt-0.5 text-gray-700 line-clamp-2 break-words">
                                {notif.question}
                              </p>
                              <p className="text-[10px] text-yellow-400/70 mt-1">
                                {notif.minutesLeft}m remaining
                              </p>
                            </div>
                          </div>
                        )}
                      </motion.div>
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
