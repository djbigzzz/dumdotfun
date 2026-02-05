import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isMobileDevice, openExternalLink } from "./mobile-utils";

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
  connectWallet: (referralCode?: string) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  signAndSendTransaction: (transaction: any) => Promise<string>;
  getPublicKey: () => any;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkPhantom = async () => {
      if (window.solana?.isPhantom) {
        setHasPhantom(true);
        if (window.solana.publicKey) {
          const walletAddress = window.solana.publicKey.toString();
          // Ensure user exists in database on page load
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

    if (document.readyState === "complete") {
      checkPhantom();
    } else {
      window.addEventListener("load", checkPhantom);
      return () => window.removeEventListener("load", checkPhantom);
    }
  }, []);

  const connectWallet = async (referralCode?: string) => {
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

      // Create user in database FIRST, then set connected state
      try {
        const res = await fetch("/api/users/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, referralCode }),
        });
        
        if (res.ok) {
          // Invalidate user query so it refetches with new data
          queryClient.invalidateQueries({ queryKey: ["user", walletAddress] });
        }
      } catch (err) {
        console.error("Failed to create user:", err);
      }
      
      // Set connected wallet AFTER user is created
      setConnectedWallet(walletAddress);
    } catch (err) {
      console.error("Failed to connect wallet:", err);
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    if (!window.solana?.isPhantom || !connectedWallet) {
      throw new Error("Phantom not available or wallet not connected");
    }

    try {
      const messageBuffer = new TextEncoder().encode(message);
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
    return window.solana?.publicKey;
  };

  const disconnectWallet = async () => {
    if (window.solana?.isPhantom) {
      try {
        await window.solana.disconnect();
      } catch (err) {
        console.error("Error disconnecting:", err);
      }
    }
    setConnectedWallet(null);
  };

  return (
    <WalletContext.Provider value={{ connectedWallet, hasPhantom, connectWallet, signMessage, signAndSendTransaction, getPublicKey, disconnectWallet }}>
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
