// PayPal Web SDK v6 wrapper
// Docs: https://developer.paypal.com/sdk/js/v6/
// The v6 <script src=".../web-sdk/v6/core"> exposes window.paypal.createInstance().
import { supabase } from "@/integrations/supabase/client";

let sdkInstance: any = null;
let inflight: Promise<any> | null = null;
let cachedClientId: string | null = null;

async function resolveClientId(): Promise<string> {
  // Prefer build-time env (safe for frontend — public client ID).
  const envId = (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) || "";
  if (envId) return envId;
  if (cachedClientId) return cachedClientId;
  // Fallback: fetch from edge function (already wired in this project).
  const { data, error } = await supabase.functions.invoke("get-paypal-config", { body: {} });
  if (error || !data?.clientId) throw new Error("PayPal client ID not configured");
  cachedClientId = data.clientId as string;
  return cachedClientId;
}

function waitForCore(timeoutMs = 8000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if ((window as any).paypal?.createInstance) return resolve();
      if (Date.now() - start > timeoutMs) return reject(new Error("PayPal core SDK failed to load"));
      setTimeout(tick, 50);
    };
    tick();
  });
}

export async function initPayPalSDK() {
  if (sdkInstance) return sdkInstance;
  if (inflight) return inflight;
  inflight = (async () => {
    await waitForCore();
    const clientId = await resolveClientId();
    const inst = await (window as any).paypal.createInstance({
      clientId,
      components: [
        "paypal-payments",
        "card-fields",
        "googlepay-payments",
        "applepay-payments",
        "venmo-payments",
      ],
      pageType: "checkout",
      locale: "en-US",
      clientMetadataId: crypto.randomUUID(),
    });
    sdkInstance = inst;
    return inst;
  })();
  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

export async function getEligibleMethods(currency: string = "USD") {
  const sdk = await initPayPalSDK();
  return sdk.findEligibleMethods({ currencyCode: currency });
}

export async function createOrder(amount: number, currency: string): Promise<{ orderId: string }> {
  const { data, error } = await supabase.functions.invoke("create-paypal-order", {
    body: { amount, currency },
  });
  if (error || !data?.orderId) {
    const msg = (data as any)?.error || error?.message || "Could not create order";
    throw new Error(msg);
  }
  return { orderId: data.orderId as string };
}

export async function captureOrder(orderId: string) {
  const { data, error } = await supabase.functions.invoke("capture-paypal-order", {
    body: { orderId },
  });
  if (error || !data?.ok) {
    throw new Error((data as any)?.error || error?.message || "Payment capture failed");
  }
  return data;
}

// JSX intrinsic elements emitted by SDK v6 (Apple Pay / Google Pay custom buttons).
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "applepay-button": any;
      "googlepay-button": any;
    }
  }
  interface Window {
    paypal?: any;
  }
}

