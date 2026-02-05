import { createContext, useContext, useEffect, useState, useMemo, ReactNode, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Connection, clusterApiUrl, Transaction } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import { 
  SolanaMobileWalletAdapter,
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler
} from "@solana-mobile/wallet-adapter-mobile";
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
        cluster: WalletAdapterNetwork.Devnet,
        onWalletNotFound: createDefaultWalletNotFoundHandler(),
      });
      setMobileAdapter(adapter);
    }
  }, [shouldUseMobileAdapter]);

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
    if (shouldUseMobileAdapter && mobileAdapter) {
      try {
        await mobileAdapter.connect();
        if (mobileAdapter.publicKey) {
          const walletAddress = mobileAdapter.publicKey.toBase58();
          await syncUserToDatabase(walletAddress, referralCode);
          setConnectedWallet(walletAddress);
          setIsMobileWallet(true);
        }
        return;
      } catch (err) {
        console.error("Mobile wallet connection failed:", err);
        return;
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
        const connection = new Connection(clusterApiUrl(WalletAdapterNetwork.Devnet));
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
    setConnectedWallet(null);
    setIsMobileWallet(false);
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
