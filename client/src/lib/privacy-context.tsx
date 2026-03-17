import React, { createContext, useContext, ReactNode } from "react";

interface PrivacyContextType {
  privateMode: boolean;
  togglePrivateMode: () => void;
  setPrivateMode: (enabled: boolean) => void;
}

const PrivacyContext = createContext<PrivacyContextType>({
  privateMode: false,
  togglePrivateMode: () => {},
  setPrivateMode: () => {},
});

export function PrivacyProvider({ children }: { children: ReactNode }) {
  return (
    <PrivacyContext.Provider value={{ privateMode: false, togglePrivateMode: () => {}, setPrivateMode: () => {} }}>
      {children}
    </PrivacyContext.Provider>
  );
}

export function usePrivacy() {
  return useContext(PrivacyContext);
}

export function obfuscateWallet(address: string | null): string {
  if (!address) return "Anonymous";
  return `${address.slice(0, 2)}••••${address.slice(-2)}`;
}
