import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [react()],

  build: {
    target: 'esnext',
    manifest: true,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // Split heavy / rarely-changing libs into cacheable vendor chunks.
        // three is only reached via lazy 3D scenes, so vendor-three stays off
        // the first-paint path; recharts (admin/analytics-only) is deliberately
        // left to natural code-splitting so it never lands on first paint.
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (/[\\/]node_modules[\\/]three[\\/]/.test(id)) return "vendor-three";
          // React core MUST get its own dedicated chunk FIRST. Otherwise rolldown
          // buries react/react-dom inside whichever vendor chunk references it
          // first (recharts' vendor-charts), making EVERY React-using module —
          // including the entry — transitively depend on the 388kB charts bundle
          // and drag it onto first paint. A dedicated ~45kB react chunk is
          // legitimately needed at startup and keeps recharts off the critical path.
          if (/[\\/]node_modules[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return "vendor-react";
          // NOTE: recharts is intentionally NOT force-grouped here. It is only
          // imported by lazy admin/analytics routes; letting rolldown code-split
          // it naturally keeps recharts (and its shared react-is) off the entry's
          // first-paint critical path. A manual vendor-charts chunk drags it eager.
          if (/[\\/]node_modules[\\/]@radix-ui[\\/]/.test(id)) return "vendor-radix";
          if (/[\\/]node_modules[\\/]@supabase[\\/]/.test(id)) return "vendor-supabase";
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom", "react-router-dom", "@supabase/supabase-js", "@tanstack/react-query"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react-is"],
  },
}));
