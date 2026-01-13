import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface PrivacyContextType {
  privateMode: boolean;
  togglePrivateMode: () => void;
  setPrivateMode: (enabled: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_KEY = "dum-fun-private-mode";

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [privateMode, setPrivateModeState] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "true";
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(privateMode));
    
    if (privateMode) {
      document.documentElement.classList.add("private-mode");
    } else {
      document.documentElement.classList.remove("private-mode");
    }
  }, [privateMode]);

  const togglePrivateMode = () => {
    setPrivateModeState(prev => !prev);
  };

  const setPrivateMode = (enabled: boolean) => {
    setPrivateModeState(enabled);
  };

  return (
    <PrivacyContext.Provider value={{ privateMode, togglePrivateMode, setPrivateMode }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error("usePrivacy must be used within a PrivacyProvider");
  }
  return context;
}

export function obfuscateWallet(address: string | null): string {
  if (!address) return "Anonymous";
  return `${address.slice(0, 2)}••••${address.slice(-2)}`;
}
