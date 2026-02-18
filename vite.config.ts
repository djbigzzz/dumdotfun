import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import { metaImagesPlugin } from "./vite-plugin-meta-images";

// Vite plugin to patch MWA protocol: replace window.location.assign with MWABridge
// In Android WebViews, window.location.assign is unforgeable and silently fails
// for custom schemes like solana-wallet://. This plugin replaces those calls with
// our native MWABridge.launchIntent() which uses Android Intents.
function mwaLocationPatchPlugin() {
  return {
    name: 'mwa-location-patch',
    transform(code: string, id: string) {
      if (!id.includes('@solana-mobile/mobile-wallet-adapter-protocol')) return;
      if (!code.includes('window.location.assign')) return;

      // Replace window.location.assign(associationUrl) with a bridge-aware version
      const patched = code.replace(
        /window\.location\.assign\((\w+)\)/g,
        '(window.MWABridge ? (console.log("MWA_BRIDGE: launching intent via native bridge"), window.MWABridge.launchIntent(String($1))) : window.location.assign($1))'
      );

      if (patched !== code) {
        console.log('[mwa-location-patch] Patched window.location.assign in:', id.split('node_modules/')[1]);
        return { code: patched, map: null };
      }
    }
  };
}

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tailwindcss(),
    metaImagesPlugin(),
    mwaLocationPatchPlugin(),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer(),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  css: {
    postcss: {
      plugins: [],
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
