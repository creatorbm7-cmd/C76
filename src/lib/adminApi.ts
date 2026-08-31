import { supabase } from "@/integrations/supabase/client";

/**
 * Invoke an admin edge function with the admin PIN session token
 * automatically attached as the x-admin-pin-session header.
 */
export async function invokeAdmin<T = unknown>(fn: string, body: Record<string, unknown>) {
  const pinToken = sessionStorage.getItem("dtx_admin_auth") ?? "";
  return supabase.functions.invoke<T>(fn, {
    body,
    headers: pinToken ? { "x-admin-pin-session": pinToken } : undefined,
  });
}

export function invokeAdminCasino<T = unknown>(body: Record<string, unknown>) {
  return invokeAdmin<T>("admin-casino", body);
}
