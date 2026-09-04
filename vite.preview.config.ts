import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  publicDir: false,
  build: {
    outDir: "preview-dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        store: resolve(__dirname, "preview/store-preview.html"),
        promo: resolve(__dirname, "preview/promo.html"),
      },
    },
  },
});
