import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type PlatformMode = 'demo' | 'live';

// Module-level cache so the mode is fetched once per session, not per component.
let cached: PlatformMode | null = null;
let inflight: Promise<PlatformMode> | null = null;

async function fetchMode(): Promise<PlatformMode> {
  if (cached) return cached;
  if (!inflight) {
    inflight = supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'mode')
      .maybeSingle()
      .then(({ data }) => {
        const m: PlatformMode = (data as { value?: string } | null)?.value === 'live' ? 'live' : 'demo';
        cached = m;
        return m;
      })
      .catch(() => 'demo' as PlatformMode)
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/**
 * Reads the platform mode ('demo' | 'live') from platform_settings.
 * Returns null until loaded. Free-play UI shows in demo; real-money UI in live.
 */
export function usePlatformMode(): PlatformMode | null {
  const [mode, setMode] = useState<PlatformMode | null>(cached);
  useEffect(() => {
    let active = true;
    fetchMode().then((m) => { if (active) setMode(m); });
    return () => { active = false; };
  }, []);
  return mode;
}
