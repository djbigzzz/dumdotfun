import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Connection, clusterApiUrl, Transaction } from "@solana/web3.js";
import { setSessionToken, getSessionToken } from "./queryClient";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";

import { toast } from "sonner";
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler
} from "@solana-mobile/wallet-adapter-mobile";
import { isMobileDevice, isMobile, openExternalLink } from "./mobile-utils";

const _viteNetwork = import.meta.env.VITE_SOLANA_NETWORK;
const SOLANA_NETWORK: WalletAdapterNetwork =
  _viteNetwork === "mainnet-beta"
    ? WalletAdapterNetwork.Mainnet
    : _viteNetwork === "testnet"
    ? WalletAdapterNetwork.Testnet
    : WalletAdapterNetwork.Devnet;

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      signAndSendTransaction: (transaction: any, options?: any) => Promise<{ signature: string }>;
      signTransaction: (transaction: any) => Promise<any>;
      on: (event: string, callback: () => void) => void;
      publicKey?: { toString: () => string; toBase58?: () => string };
    };
  }
}

interface WalletContextType {
  connectedWallet: string | null;
  hasPhantom: boolean;
  isMobileWallet: boolean;
  connectWallet: (referralCode?: string) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signAndSendTransaction: (transaction: any) => Promise<string>;
  getPublicKey: () => any;
  disconnectWallet: () => Promise<void>;
  ensureSession: () => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [mobileAdapter, setMobileAdapter] = useState<SolanaMobileWalletAdapter | null>(null);
  const [isMobileWallet, setIsMobileWallet] = useState(false);
  const queryClient = useQueryClient();

  const shouldUseMobileAdapter = useMemo(() => {
    return isMobileDevice() || isMobile();
  }, []);

  useEffect(() => {
    if (shouldUseMobileAdapter) {
      const adapter = new SolanaMobileWalletAdapter({
        addressSelector: createDefaultAddressSelector(),
        appIdentity: {
          name: 'Dum.fun',
          uri: typeof window !== 'undefined' ? window.location.origin : 'https://dum.fun',
          icon: '/favicon.ico',
        },
        authorizationResultCache: createDefaultAuthorizationResultCache(),
        cluster: SOLANA_NETWORK,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      });
      setMobileAdapter(adapter);
    }
  }, [shouldUseMobileAdapter]);

  // ===== Sign-In-With-Solana =====
  // Signs a server-issued nonce with the user's wallet and exchanges it for
  // a session token. The session token is sent as `Authorization: Bearer ...`
  // on subsequent API calls (see queryClient.ts).
  const signInWithSolana = useCallback(
    async (walletAddress: string, signer: (msg: Uint8Array) => Promise<Uint8Array>) => {
      const nonceRes = await fetch("/api/auth/nonce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });
      if (!nonceRes.ok) throw new Error("Failed to fetch nonce");
      const { message } = await nonceRes.json();
      const sigBytes = await signer(new TextEncoder().encode(message));
      const sigB64 = btoa(String.fromCharCode(...Array.from(sigBytes)));
      const verifyRes = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, signature: sigB64 }),
      });
      if (!verifyRes.ok) {
        const t = await verifyRes.text();
        throw new Error(`Verify failed: ${t}`);
      }
      const { sessionToken } = await verifyRes.json();
      setSessionToken(sessionToken);
      return sessionToken as string;
    },
    [],
  );

  const ensureValidSession = useCallback(
    async (walletAddress: string, signer: (msg: Uint8Array) => Promise<Uint8Array>) => {
      const existing = getSessionToken();
      if (existing) {
        try {
          const me = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${existing}` } });
          if (me.ok) {
            const data = await me.json();
            if (data?.walletAddress === walletAddress) return existing;
          }
        } catch {
          /* fall through to re-auth */
        }
      }
      return signInWithSolana(walletAddress, signer);
    },
    [signInWithSolana],
  );

  useEffect(() => {
    const checkPhantom = async () => {
      if (window.solana?.isPhantom) {
        setHasPhantom(true);
        // Auto-reconnect if Phantom already has a trusted session
        if (window.solana.publicKey) {
          const walletAddress = window.solana.publicKey.toString();
          // Don't force a re-sign on page load — wait until the user takes
          // an action that needs auth, or until they explicitly reconnect.
          setConnectedWallet(walletAddress);
        }
      }
    };

    // Always check for injected Phantom (covers desktop extension + Phantom mobile browser)
    if (document.readyState === "complete") {
      checkPhantom();
    } else {
      window.addEventListener("load", checkPhantom);
      return () => window.removeEventListener("load", checkPhantom);
    }
  }, []);

  const syncUserToDatabase = useCallback(async (walletAddress: string, referralCode?: string) => {
    try {
      const res = await fetch("/api/users/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getSessionToken() ? { Authorization: `Bearer ${getSessionToken()}` } : {}),
        },
        body: JSON.stringify({ walletAddress, referralCode }),
      });

      if (res.ok) {
        try {
          const data = await res.json();
          queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
          if (data?.pointsAwarded && Array.isArray(data.pointsAwarded)) {
            for (const p of data.pointsAwarded) {
              const label = p.action === "connect_wallet" ? "Wallet Connected" : p.action === "daily_login" ? "Daily Check-in" : p.action;
              toast.success(`+${p.points} pts — ${label}`, { duration: 3000 });
            }
          }
        } catch {
          queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
        }
      } else if (res.status === 401) {
        console.warn("[connect] not authenticated yet — session will be created on next sign-in");
      }
    } catch (err) {
      console.error("Failed to create user:", err);
    }
  }, [queryClient]);

  const connectWallet = async (referralCode?: string) => {
    // Priority 1: injected Phantom wallet (desktop extension OR Phantom mobile browser)
    if (window.solana?.isPhantom) {
      try {
        const response = await window.solana.connect({ onlyIfTrusted: false });
        const walletAddress = response.publicKey.toString();
        // SIWS: sign nonce -> get session token -> then sync user
        try {
          await ensureValidSession(walletAddress, async (msg) => {
            const r = await window.solana!.signMessage(msg);
            return r.signature;
          });
        } catch (e: any) {
          console.error("[SIWS] sign-in failed:", e);
          toast.error("Sign-in cancelled. Wallet connected but you'll need to sign in to earn points.");
        }
        await syncUserToDatabase(walletAddress, referralCode);
        setConnectedWallet(walletAddress);
        toast.success("Wallet connected!", { duration: 2500 });
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes("rejected")) {
          toast.error("Connection cancelled.");
        } else {
          console.error("Failed to connect wallet:", err);
          toast.error("Failed to connect wallet.");
        }
      }
      return;
    }

    // Priority 2: Mobile Wallet Adapter (MWA) — for native mobile wallet apps
    if (shouldUseMobileAdapter && mobileAdapter) {
      try {
        await mobileAdapter.connect();
        if (mobileAdapter.publicKey) {
          const walletAddress = mobileAdapter.publicKey.toBase58();
          try {
            await ensureValidSession(walletAddress, async (msg) => {
              return await mobileAdapter.signMessage(msg);
            });
          } catch (e: any) {
            console.error("[SIWS] mobile sign-in failed:", e);
            toast.error("Sign-in cancelled.");
          }
          await syncUserToDatabase(walletAddress, referralCode);
          setConnectedWallet(walletAddress);
          setIsMobileWallet(true);
          toast.success("Wallet connected!", { duration: 2500 });
        }
        return;
      } catch (err) {
        console.error("Mobile wallet connection failed:", err);
        // Fall through to prompt install
      }
    }

    // No wallet found — prompt user to install Phantom
    if (isMobileDevice()) {
      openExternalLink("https://phantom.app/download");
    } else {
      window.open("https://phantom.app/", "_blank");
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    const messageBuffer = new TextEncoder().encode(message);

    if (isMobileWallet && mobileAdapter) {
      try {
        const signature = await mobileAdapter.signMessage(messageBuffer);
        const signatureArray = Array.from(signature);
        const binaryString = String.fromCharCode(...signatureArray);
        return btoa(binaryString);
      } catch (err) {
        console.error("Mobile wallet sign message failed:", err);
        throw err;
      }
    }

    if (!window.solana?.isPhantom || !connectedWallet) {
      throw new Error("Phantom not available or wallet not connected");
    }

    try {
      const response = await window.solana.signMessage(messageBuffer);
      const signatureArray = Array.from(response.signature);
      const binaryString = String.fromCharCode(...signatureArray);
      return btoa(binaryString);
    } catch (err) {
      console.error("Failed to sign message:", err);
      throw err;
    }
  };

  const signAndSendTransaction = async (transaction: any): Promise<string> => {
    if (isMobileWallet && mobileAdapter) {
      try {
        const connection = new Connection(clusterApiUrl(SOLANA_NETWORK));
        const signedTx = await mobileAdapter.signTransaction(transaction);
        const signature = await connection.sendRawTransaction(signedTx.serialize());
        return signature;
      } catch (err) {
        console.error("Mobile wallet transaction failed:", err);
        throw err;
      }
    }

    if (!window.solana?.isPhantom || !connectedWallet) {
      throw new Error("Phantom not available or wallet not connected");
    }

    try {
      const result = await window.solana.signAndSendTransaction(transaction);
      return result.signature;
    } catch (err) {
      console.error("Failed to sign and send transaction:", err);
      throw err;
    }
  };

  const getPublicKey = () => {
    if (isMobileWallet && mobileAdapter) {
      return mobileAdapter.publicKey;
    }
    return window.solana?.publicKey;
  };

  const disconnectWallet = async () => {
    if (isMobileWallet && mobileAdapter) {
      try {
        await mobileAdapter.disconnect();
      } catch (err) {
        console.error("Mobile wallet disconnect error:", err);
      }
    } else if (window.solana?.isPhantom) {
      try {
        await window.solana.disconnect();
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
    }
    // Clear SIWS session
    try {
      const tok = getSessionToken();
      if (tok) {
        await fetch("/api/auth/logout", { method: "POST", headers: { Authorization: `Bearer ${tok}` } });
      }
    } catch (err) {
      console.error("Logout request failed:", err);
    }
    setSessionToken(null);
    setConnectedWallet(null);
    setIsMobileWallet(false);
  };

  // Public helper: any gated mutation should `await ensureSession()` before
  // calling a `requireAuth` endpoint. This handles the case where Phantom
  // auto-reconnected on page load but no SIWS session exists yet.
  const ensureSession = useCallback(async (): Promise<string> => {
    if (!connectedWallet) {
      throw new Error("Connect your wallet first");
    }
    const signer = async (msg: Uint8Array): Promise<Uint8Array> => {
      if (isMobileWallet && mobileAdapter) {
        return await mobileAdapter.signMessage(msg);
      }
      if (!window.solana?.isPhantom) {
        throw new Error("Phantom wallet not available");
      }
      const r = await window.solana.signMessage(msg);
      return r.signature;
    };
    return ensureValidSession(connectedWallet, signer);
  }, [connectedWallet, isMobileWallet, mobileAdapter, ensureValidSession]);

  return (
    <WalletContext.Provider value={{ 
      connectedWallet, 
      hasPhantom, 
      isMobileWallet,
      connectWallet, 
      signMessage, 
      signAndSendTransaction, 
      getPublicKey, 
      disconnectWallet,
      ensureSession,
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return context;
}
