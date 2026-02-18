import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { isMobileDevice, isMobile, openExternalLink } from "./mobile-utils";

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
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

// Store MWA auth token and base64 address for reuse across transact() calls
let mwaAuthToken: string | null = null;
let mwaBase64Address: string | null = null;

// Dynamic import to avoid crashing the app if the module has issues
async function getMwaTransact() {
  const mod = await import("@solana-mobile/mobile-wallet-adapter-protocol-web3js");
  return mod.transact;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);
  const [isMobileWallet, setIsMobileWallet] = useState(false);
  const publicKeyRef = useRef<PublicKey | null>(null);
  const queryClient = useQueryClient();

  const shouldUseMobileAdapter = useMemo(() => {
    return isMobileDevice() || isMobile();
  }, []);

  useEffect(() => {
    const checkPhantom = async () => {
      if (window.solana?.isPhantom) {
        setHasPhantom(true);
        if (window.solana.publicKey) {
          const walletAddress = window.solana.publicKey.toString();
          try {
            await fetch("/api/users/connect", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ walletAddress }),
            });
          } catch (err) {
            console.error("Failed to sync user on load:", err);
          }
          setConnectedWallet(walletAddress);
        }
      }
    };

    if (!shouldUseMobileAdapter) {
      if (document.readyState === "complete") {
        checkPhantom();
      } else {
        window.addEventListener("load", checkPhantom);
        return () => window.removeEventListener("load", checkPhantom);
      }
    }
  }, [shouldUseMobileAdapter]);

  const syncUserToDatabase = useCallback(async (walletAddress: string, referralCode?: string) => {
    try {
      const res = await fetch("/api/users/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress, referralCode }),
      });

      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
      }
    } catch (err) {
      console.error("Failed to create user:", err);
    }
  }, [queryClient]);

  const connectWallet = async (referralCode?: string) => {
    // Use low-level MWA transact() on mobile — bypasses wallet-standard discovery
    if (shouldUseMobileAdapter) {
      try {
        const transact = await getMwaTransact();
        const result = await transact(async (wallet: any) => {
          const auth = await wallet.authorize({
            chain: 'solana:devnet',
            identity: {
              name: 'Dum.fun',
              uri: typeof window !== 'undefined' ? window.location.origin : 'https://dum.fun',
              icon: '/favicon.ico',
            },
          });
          mwaAuthToken = auth.auth_token;
          mwaBase64Address = auth.accounts[0].address;
          return {
            address: auth.accounts[0].address,
          };
        });

        if (result.address) {
          // address from MWA is base64-encoded public key — validate before use
          const pubkeyBytes = Uint8Array.from(atob(result.address), c => c.charCodeAt(0));
          if (pubkeyBytes.length !== 32) {
            throw new Error(`Invalid public key length: ${pubkeyBytes.length}`);
          }
          publicKeyRef.current = new PublicKey(pubkeyBytes);
          const walletAddress = publicKeyRef.current.toBase58();
          await syncUserToDatabase(walletAddress, referralCode);
          setConnectedWallet(walletAddress);
          setIsMobileWallet(true);
        }
        return;
      } catch (err: any) {
        console.error("Mobile wallet connection failed:", err);
        if (isMobile()) {
          throw new Error("Failed to connect mobile wallet: " + (err.message || "Unknown error"));
        }
      }
    }

    if (!window.solana?.isPhantom) {
      if (isMobileDevice()) {
        openExternalLink("https://phantom.app/download");
      } else {
        window.open("https://phantom.app/", "_blank");
      }
      return;
    }

    try {
      const response = await window.solana.connect({ onlyIfTrusted: false });
      const walletAddress = response.publicKey.toString();
      await syncUserToDatabase(walletAddress, referralCode);
      setConnectedWallet(walletAddress);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    const messageBuffer = new TextEncoder().encode(message);

    if (isMobileWallet) {
      try {
        const transact = await getMwaTransact();
        const result = await transact(async (wallet: any) => {
          if (mwaAuthToken) {
            await wallet.reauthorize({
              auth_token: mwaAuthToken,
              identity: {
                name: 'Dum.fun',
                uri: typeof window !== 'undefined' ? window.location.origin : 'https://dum.fun',
                icon: '/favicon.ico',
              },
            });
          }
          const signed = await wallet.signMessages({
            addresses: [mwaBase64Address!],
            payloads: [messageBuffer],
          });
          return signed[0];
        });
        const signatureArray = Array.from(new Uint8Array(result));
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
    if (isMobileWallet) {
      try {
        const connection = new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet));

        // Use signTransactions (not signAndSendTransactions) to keep the MWA
        // session short. signAndSendTransactions requires the wallet to sign,
        // send to RPC, and wait — the long session causes WS drops (1001).
        // Instead: sign quickly, then send ourselves with skipPreflight.
        const transact = await getMwaTransact();
        const signedTx = await transact(async (wallet: any) => {
          if (mwaAuthToken) {
            await wallet.reauthorize({
              auth_token: mwaAuthToken,
              identity: {
                name: 'Dum.fun',
                uri: typeof window !== 'undefined' ? window.location.origin : 'https://dum.fun',
                icon: '/favicon.ico',
              },
            });
          }

          // Fetch fresh blockhash inside MWA session, right before signing
          const { blockhash } = await connection.getLatestBlockhash('confirmed');
          transaction.recentBlockhash = blockhash;

          const signed = await wallet.signTransactions({
            transactions: [transaction],
          });
          return signed[0];
        });

        // Send immediately after MWA returns — skip preflight to avoid
        // stale blockhash simulation errors
        const signature = await connection.sendRawTransaction(signedTx.serialize(), {
          skipPreflight: true,
          maxRetries: 3,
        });

        // Poll for confirmation via HTTP (WebSocket doesn't work in WebView)
        for (let i = 0; i < 30; i++) {
          const { value } = await connection.getSignatureStatuses([signature]);
          if (value?.[0]?.confirmationStatus === 'confirmed' || value?.[0]?.confirmationStatus === 'finalized') {
            break;
          }
          await new Promise(r => setTimeout(r, 1000));
        }
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
    if (isMobileWallet) {
      return publicKeyRef.current;
    }
    return window.solana?.publicKey;
  };

  const disconnectWallet = async () => {
    if (isMobileWallet) {
      try {
        const transact = await getMwaTransact();
        await transact(async (wallet: any) => {
          if (mwaAuthToken) {
            await wallet.deauthorize({ auth_token: mwaAuthToken });
          }
        });
      } catch (err) {
        console.error("Mobile wallet disconnect error:", err);
      } finally {
        // Always clear tokens regardless of deauthorize success/failure
        mwaAuthToken = null;
        mwaBase64Address = null;
      }
    } else if (window.solana?.isPhantom) {
      try {
        await window.solana.disconnect();
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
    }
    setConnectedWallet(null);
    setIsMobileWallet(false);
    publicKeyRef.current = null;
  };

  return (
    <WalletContext.Provider value={{
      connectedWallet,
      hasPhantom,
      isMobileWallet,
      connectWallet,
      signMessage,
      signAndSendTransaction,
      getPublicKey,
      disconnectWallet
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
