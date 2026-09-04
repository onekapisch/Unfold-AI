import { defineConfig } from "vite";
import { resolve } from "path";

// Builds three entry points:
//  - content script (IIFE, injected into provider pages)
//  - background service worker (ES module)
//  - popup (HTML + TS)
export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@providers": resolve(__dirname, "src/providers"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV === "development",
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/service-worker.ts"),
        popup: resolve(__dirname, "src/popup/popup.html"),
        onboarding: resolve(__dirname, "src/onboarding/onboarding.html"),
        saved: resolve(__dirname, "src/saved/saved.html"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === "background") return "background.js";
          return "[name]-[hash].js";
        },
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
