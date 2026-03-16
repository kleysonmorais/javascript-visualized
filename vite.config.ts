/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    // Chunk splitting for better caching
    rollupOptions: {
      output: {
        manualChunks: {
          monaco: ["@monaco-editor/react"],
          framer: ["framer-motion"],
          vendor: ["react", "react-dom", "zustand"],
        },
      },
    },
    // Source maps for debugging (optional, can disable for smaller build)
    sourcemap: false,
    // Target modern browsers
    target: "es2020",
  },
  resolve: {
    alias: {
      "@/components": path.resolve(__dirname, "src/components"),
      "@/engine": path.resolve(__dirname, "src/engine"),
      "@/types": path.resolve(__dirname, "src/types"),
      "@/hooks": path.resolve(__dirname, "src/hooks"),
      "@/store": path.resolve(__dirname, "src/store"),
      "@/lib": path.resolve(__dirname, "src/lib"),
      "@/constants": path.resolve(__dirname, "src/constants"),
      "@/utils": path.resolve(__dirname, "src/utils"),
      "@/i18n": path.resolve(__dirname, "src/i18n.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/engine/**"],
      reporter: ["text", "text-summary"],
    },
  },
});
