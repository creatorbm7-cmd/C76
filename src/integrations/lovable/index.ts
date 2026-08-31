// Native Supabase OAuth wrapper (Lovable-decoupled).
// Keeps the historical `lovable.auth.signInWithOAuth(...)` call shape so any
// future caller compiles, but routes everything through supabase.auth directly.
// The @lovable.dev/cloud-auth-js package is no longer required.

import { supabase } from "../supabase/client";

type Provider = "google" | "apple" | "azure"; // azure = Microsoft
type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

export const lovable = {
  auth: {
    signInWithOAuth: async (provider: Provider, opts?: SignInOptions) => {
      const redirectTo =
        opts?.redirect_uri ?? `${window.location.origin}/auth/callback`;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          queryParams: opts?.extraParams,
        },
      });
      if (error) {
        return { error, redirected: false as const };
      }
      // Supabase returns a URL the browser must navigate to. signInWithOAuth
      // already sets window.location, but we surface the same shape callers expect.
      return { redirected: true as const, url: data?.url ?? null };
    },
    signOut: () => supabase.auth.signOut(),
    getSession: () => supabase.auth.getSession(),
  },
};
