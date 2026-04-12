import { defineConfig } from "vite";
import { resolve } from "path";

// Firefox MV2 build — produces dist-firefox/
// Background script is a plain script (not a service worker).
// Content script is identical to Chrome build.
export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@providers": resolve(__dirname, "src/providers"),
    },
  },
  build: {
    outDir: "dist-firefox",
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/background-mv2.ts"),
        popup: resolve(__dirname, "src/popup/popup.html"),
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
