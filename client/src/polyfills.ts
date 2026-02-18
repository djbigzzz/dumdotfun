import { Buffer } from "buffer";

declare global {
  interface Window {
    MWABridge?: {
      launchIntent(url: string): void;
    };
  }
}

if (typeof window !== "undefined") {
  (window as any).Buffer = Buffer;
  (window as any).global = window;

  // On native Capacitor (origin is https://localhost), rewrite /api/ requests to the Replit backend
  const isCapacitor = window.location.origin === "https://localhost";
  if (isCapacitor) {
    const _origFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === "string" && input.startsWith("/api/")) {
        input = "https://dumfun.replit.app" + input;
      } else if (input instanceof Request && input.url.startsWith("/api/")) {
        input = new Request("https://dumfun.replit.app" + input.url, input);
      }
      return _origFetch.call(window, input, init);
    };
  }
}

export {};
