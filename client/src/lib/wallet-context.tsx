import { createContext, useContext, useEffect, useState, ReactNode } from "react";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: (options?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: () => void) => void;
      publicKey?: { toString: () => string };
    };
  }
}

interface WalletContextType {
  connectedWallet: string | null;
  hasPhantom: boolean;
  connectWallet: () => Promise<void>;
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

  const connectWallet = async () => {
    if (!window.solana?.isPhantom) {
      window.open("https://phantom.app/", "_blank");
      return;
    }

    try {
      const response = await window.solana.connect({ onlyIfTrusted: false });
      setConnectedWallet(response.publicKey.toString());
    } catch (err) {
      console.error("Failed to connect wallet:", err);
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
    <WalletContext.Provider value={{ connectedWallet, hasPhantom, connectWallet, disconnectWallet }}>
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
