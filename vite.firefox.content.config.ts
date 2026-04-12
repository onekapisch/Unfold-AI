import { defineConfig } from "vite";
import { resolve } from "path";

// Firefox content script — same IIFE build as Chrome but targets dist-firefox/
export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@providers": resolve(__dirname, "src/providers"),
    },
  },
  build: {
    outDir: "dist-firefox",
    emptyOutDir: false,   // don't wipe background.js / popup already built
    sourcemap: false,
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      formats: ["iife"],
      name: "UnfoldAI",
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
