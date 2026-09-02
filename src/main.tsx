import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import App from "./App.tsx";
import { ErrorBoundary } from "./ErrorBoundary";
import { wagmiConfig } from "./lib/web3/appkit";
import "./index.css";
import "./styles/ig-cartoon.css";
import "./styles/ig-premium.css";

// Force dark background immediately - no flash
document.documentElement.style.background = "#04060a";
document.body.style.background = "#04060a";

// Self-heal blank screens caused by a stale service-worker / cached client
// loading chunk hashes from a previous deploy. A failed dynamic import surfaces
// as a global error or unhandled rejection; we force ONE hard reload so the
// browser fetches the fresh index.html + asset graph. sessionStorage guards
// against a reload loop if the failure is not deploy-related.
const CHUNK_RELOAD_KEY = "__c7_chunk_reload__";
const isChunkError = (msg: string) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|Loading chunk [\w-]+ failed|ChunkLoadError|error loading dynamically imported module/i.test(
    msg,
  );
async function maybeReloadOnChunkError(msg: string) {
  if (!isChunkError(msg)) return;
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY)) return;
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  // A stale service worker can keep serving a previous deploy's index/chunks, so
  // a plain reload hits the same dead chunk and the guard then shows the error
  // screen. Purge the SW + caches first so the reload fetches a fresh graph.
  try {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if (typeof caches !== "undefined") {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch { /* best-effort — reload regardless */ }
  window.location.reload();
}
window.addEventListener("error", (e) => maybeReloadOnChunkError(String(e?.message || "")));
window.addEventListener("unhandledrejection", (e) =>
  maybeReloadOnChunkError(String((e?.reason && (e.reason.message || e.reason)) || "")),
);
// Clear the guard once the app has mounted successfully.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 4000);
});

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000 } }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <App />
        <Analytics />
        <SpeedInsights />
      </QueryClientProvider>
    </WagmiProvider>
  </ErrorBoundary>
);

