import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["brand/*.png"],
      manifest: false,
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ["**/*.{js,css,html,ico,png,svg,json,wasm,model}"],
        globIgnores: ["**/web-llm-*.js", "**/web-llm.worker-*.js"],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
  },
  worker: {
    format: "es",
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return undefined;
          if (id.includes("/@mlc-ai/")) {
            return "web-llm-client";
          }
          if (id.includes("react-syntax-highlighter") || id.includes("refractor") || id.includes("prismjs")) {
            return "markdown-vendor";
          }
          if (id.includes("katex") || id.includes("rehype-katex")) {
            return "math-vendor";
          }
          if (
            id.includes("react-markdown") ||
            id.includes("remark-") ||
            id.includes("micromark") ||
            id.includes("mdast-") ||
            id.includes("unified")
          ) {
            return "markdown-core";
          }
          if (id.includes("/motion/") || id.includes("framer-motion")) {
            return "motion-vendor";
          }
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/") || id.includes("/@tanstack/")) {
            return "vendor";
          }
          return undefined;
        },
      },
    },
  },
});
