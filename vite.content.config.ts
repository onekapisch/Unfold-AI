import { defineConfig } from "vite";
import { resolve } from "path";

// Separate build for the content script so it's emitted as a single IIFE
// with all imports inlined — required for MV3 content scripts.
export default defineConfig({
  resolve: {
    alias: {
      "@core": resolve(__dirname, "src/core"),
      "@providers": resolve(__dirname, "src/providers"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: process.env.NODE_ENV === "development",
    lib: {
      entry: resolve(__dirname, "src/content/index.ts"),
      formats: ["iife"],
      name: "LayeredAIReader",
      fileName: () => "content.js",
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
