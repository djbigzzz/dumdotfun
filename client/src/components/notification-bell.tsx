import { useQuery } from "@tanstack/react-query";
import { Bell, XCircle, Clock, Trophy, X, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback, useMemo } from "react";
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

// Two sets per wallet, persisted in localStorage:
//   read      - badge no longer counts these (cleared automatically on open)
//   dismissed - hidden from the main list (only shown in "History" view)
// Splitting them lets the red dot clear the moment the user looks at the
// dropdown, while the items themselves stay visible until explicitly closed
// and remain reachable later via the history toggle.
const readKey = (wallet: string) => `notifications:read:${wallet}`;
const dismissedKey = (wallet: string) => `notifications:dismissed:${wallet}`;

function loadSet(key: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, ids: Set<string>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(Array.from(ids)));
  } catch {
    // localStorage quota or disabled - silently degrade to in-memory only.
  }
}

export function NotificationBell() {
  const { connectedWallet } = useWallet();
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [read, setRead] = useState<Set<string>>(() =>
    connectedWallet ? loadSet(readKey(connectedWallet)) : new Set(),
  );
  const [dismissed, setDismissed] = useState<Set<string>>(() =>
    connectedWallet ? loadSet(dismissedKey(connectedWallet)) : new Set(),
  );

  // Re-hydrate state when the active wallet changes (account switch in
  // Phantom, fresh mount, etc). Each wallet keeps its own lists.
  useEffect(() => {
    setRead(connectedWallet ? loadSet(readKey(connectedWallet)) : new Set());
    setDismissed(connectedWallet ? loadSet(dismissedKey(connectedWallet)) : new Set());
    setShowHistory(false);
  }, [connectedWallet]);

  const dismissOne = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      if (connectedWallet) saveSet(dismissedKey(connectedWallet), next);
      return next;
    });
  }, [connectedWallet]);

  const undismissOne = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.delete(id);
      if (connectedWallet) saveSet(dismissedKey(connectedWallet), next);
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

  const allNotifications = data?.notifications || [];
  const visibleNotifications = useMemo(
    () => allNotifications.filter((n) => !dismissed.has(n.id)),
    [allNotifications, dismissed],
  );
  const dismissedNotifications = useMemo(
    () => allNotifications.filter((n) => dismissed.has(n.id)),
    [allNotifications, dismissed],
  );
  const unreadCount = useMemo(
    () => visibleNotifications.filter((n) => !read.has(n.id)).length,
    [visibleNotifications, read],
  );

  // Auto-mark currently visible notifications as read the moment the user
  // opens the dropdown - this is the "I saw it" signal, no extra click needed.
  useEffect(() => {
    if (!open || !connectedWallet) return;
    const ids = visibleNotifications.map((n) => n.id).filter((id) => !read.has(id));
    if (ids.length === 0) return;
    setRead((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      saveSet(readKey(connectedWallet), next);
      return next;
    });
  }, [open, connectedWallet, visibleNotifications, read]);

  if (!connectedWallet) return null;

  const listToShow = showHistory ? dismissedNotifications : visibleNotifications;

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
              <div className="p-3 border-b border-gray-200 sticky top-0 bg-white z-10">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-sm text-gray-900">
                    {showHistory ? "History" : "Notifications"}
                  </h3>
                  <div className="flex items-center gap-1">
                    {!showHistory && visibleNotifications.length > 0 && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const all = new Set(dismissed);
                          visibleNotifications.forEach((n) => all.add(n.id));
                          setDismissed(all);
                          if (connectedWallet) saveSet(dismissedKey(connectedWallet), all);
                        }}
                        className="text-[10px] font-bold uppercase tracking-wide text-gray-500 hover:text-gray-900 px-2 py-1 rounded hover:bg-gray-100"
                        data-testid="button-clear-notifications"
                      >
                        Clear all
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setShowHistory((v) => !v);
                      }}
                      className={`text-[10px] font-bold uppercase tracking-wide px-2 py-1 rounded flex items-center gap-1 ${
                        showHistory
                          ? "bg-gray-900 text-white"
                          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                      data-testid="button-toggle-history"
                      title={showHistory ? "Back to current" : "View dismissed notifications"}
                    >
                      <History className="w-3 h-3" />
                      {showHistory ? "Current" : "History"}
                      {!showHistory && dismissedNotifications.length > 0 && (
                        <span className="text-gray-400">({dismissedNotifications.length})</span>
                      )}
                    </button>
                    <button
                      onClick={() => setOpen(false)}
                      className="p-1 rounded text-gray-400 hover:text-gray-600"
                      data-testid="button-close-notifications"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {listToShow.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  {showHistory ? "No dismissed notifications" : "No notifications"}
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {listToShow.map((notif) => {
                    const isRead = read.has(notif.id);
                    return (
                      <motion.div
                        key={notif.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setOpen(false);
                          navigate(`/market/${notif.marketId}`);
                        }}
                        className={`p-3 cursor-pointer transition-colors hover:bg-gray-50 ${
                          isRead && !showHistory ? "opacity-70" : ""
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
                            {showHistory ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  undismissOne(notif.id);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-900 px-2 self-start"
                                data-testid={`button-restore-${notif.id}`}
                                title="Move back to current"
                              >
                                Restore
                              </button>
                            ) : (
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
                            )}
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
                            {showHistory ? (
                              <button
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  undismissOne(notif.id);
                                }}
                                className="text-[10px] font-bold uppercase tracking-wide text-gray-400 hover:text-gray-900 px-2 self-start"
                                data-testid={`button-restore-${notif.id}`}
                                title="Move back to current"
                              >
                                Restore
                              </button>
                            ) : (
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
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
