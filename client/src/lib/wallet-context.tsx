import { createContext, useContext, useEffect, useState, ReactNode } from "react";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array) => Promise<{ signature: Uint8Array }>;
      on: (event: string, callback: () => void) => void;
      publicKey?: { toString: () => string };
    };
  }
}

interface WalletContextType {
  connectedWallet: string | null;
  hasPhantom: boolean;
  connectWallet: (referralCode?: string) => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  disconnectWallet: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedWallet, setConnectedWallet] = useState<string | null>(null);
  const [hasPhantom, setHasPhantom] = useState(false);

  useEffect(() => {
    const checkPhantom = () => {
      if (window.solana?.isPhantom) {
        setHasPhantom(true);
        if (window.solana.publicKey) {
          setConnectedWallet(window.solana.publicKey.toString());
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
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      const response = await window.solana.connect({ onlyIfTrusted: false });
      const walletAddress = response.publicKey.toString();
      setConnectedWallet(walletAddress);

      // Create user in database with optional referral code
      try {
        await fetch("/api/users/connect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ walletAddress, referralCode }),
        });
      } catch (err) {
        console.error("Failed to create user:", err);
      }
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
      
      // Convert signature bytes to base64 string using browser-compatible method
      const signatureArray = Array.from(response.signature);
      const binaryString = String.fromCharCode(...signatureArray);
      return btoa(binaryString);
    } catch (err) {
      console.error("Failed to sign message:", err);
      throw err;
    }
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
    <WalletContext.Provider value={{ connectedWallet, hasPhantom, connectWallet, signMessage, disconnectWallet }}>
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
