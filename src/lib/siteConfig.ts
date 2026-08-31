import { supabase } from "@/integrations/supabase/client";

/**
 * site_config helper — read/write the key/value store that backs the admin
 * "Web Settings" tabs (bank details, welcome message, first deposit, invite
 * bonus, currency/lang, colours, provider non-secret fields).
 *
 * Reads go straight from the public-readable `site_config` table.
 * Writes go through the `admin-casino` edge function (`update_site_config`
 * action) which enforces admin JWT + PIN 2FA + a key whitelist — the client
 * roles have no write grant on the table. NEVER pass secrets (API tokens,
 * private keys) here: site_config is public-readable by design.
 */
export async function getSiteConfig<T = Record<string, unknown>>(key: string, fallback: T): Promise<T> {
  const { data, error } = await supabase
    .from("site_config")
    .select("value")
    .eq("key", key)
    .maybeSingle();
  if (error) return fallback;
  return ((data?.value as T) ?? fallback);
}

export async function saveSiteConfig(key: string, value: Record<string, unknown>): Promise<void> {
  const pin = sessionStorage.getItem("dtx_admin_auth") ?? "";
  const { data, error } = await supabase.functions.invoke("admin-casino", {
    body: { action: "update_site_config", key, value },
    headers: pin ? { "x-admin-pin-session": pin } : undefined,
  });
  if (error) throw new Error(error.message || "Save failed");
  if ((data as { error?: string } | null)?.error) throw new Error((data as { error: string }).error);
}
