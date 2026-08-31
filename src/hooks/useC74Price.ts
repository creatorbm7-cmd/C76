// useC74Price — the single source of truth for the C74 token's USD valuation.
//
// It reads the SAME authoritative value the platform's economics use:
// `platform_settings.energy_usd`, which `c74_config()` exposes as `usdt_per_c74`
// (the USD value of 1 C74) and which `request_crypto_withdrawal` uses to value
// energy against real withdrawal fees. Reading it here means the *displayed*
// price can never drift from what the platform actually credits/charges.
//
// It stays SEPARATE from:
//   • network gas prices (native ETH/BNB/… gas, read live per-chain), and
//   • the treasury swap rate (derived as 1/energy_usd, admin tool).
//
// Oracle-ready by design: to move to a live market feed later, swap ONLY the
// resolver below (fetch from an oracle and set source:'oracle') — every consumer
// keeps calling useC74Price() unchanged, so no UI touches. Note: if C74 ever
// floats on a market, the internal energy peg (energy_usd) must move with it, or
// they diverge again — keep them wired to one source.
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

/** Where the current price came from — provenance for display/audit. */
export type C74PriceSource = 'platform_config' | 'oracle' | 'default';

export interface C74Price {
  /** USD value of 1 C74 (= platform_settings.energy_usd = c74_config.usdt_per_c74). */
  usd: number;
  /** Provenance of `usd`. */
  source: C74PriceSource;
  /** Ready-made label, e.g. "1 C74 = $0.01". */
  label: string;
}

// Platform default valuation until the config value loads. Matches the live
// `energy_usd` peg so a failed read never shows a wrong price.
export const DEFAULT_C74_PRICE_USD = 0.01;

export const formatC74Usd = (usd: number): string =>
  `$${usd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: usd < 0.01 ? 6 : 2 })}`;

const priceLabel = (usd: number): string => `1 C74 = ${formatC74Usd(usd)}`;

// Module-level cache so the price is fetched once per session, not per component.
let cached: C74Price | null = null;
let inflight: Promise<C74Price> | null = null;

// The resolver: read the authoritative internal peg (energy_usd). Replace this
// read with an oracle call to go live-market later (and move energy_usd with it).
async function fetchC74Price(): Promise<C74Price> {
  if (cached) return cached;
  if (!inflight) {
    inflight = supabase
      .from('platform_settings')
      .select('value')
      .eq('key', 'energy_usd')
      .maybeSingle()
      .then(({ data }): C74Price => {
        const raw = (data as { value?: string } | null)?.value;
        const n = raw != null && raw !== '' ? Number(raw) : NaN;
        const usd = Number.isFinite(n) && n > 0 ? n : DEFAULT_C74_PRICE_USD;
        const p: C74Price = {
          usd,
          source: Number.isFinite(n) && n > 0 ? 'platform_config' : 'default',
          label: priceLabel(usd),
        };
        cached = p;
        return p;
      })
      .catch((): C74Price => ({ usd: DEFAULT_C74_PRICE_USD, source: 'default', label: priceLabel(DEFAULT_C74_PRICE_USD) }))
      .finally(() => { inflight = null; });
  }
  return inflight;
}

/**
 * The platform's C74 → USD valuation, matching internal economics. Never null:
 * starts from the default synchronously, then updates to the config value.
 */
export function useC74Price(): C74Price {
  const [price, setPrice] = useState<C74Price>(
    cached ?? { usd: DEFAULT_C74_PRICE_USD, source: 'default', label: priceLabel(DEFAULT_C74_PRICE_USD) },
  );
  useEffect(() => {
    let active = true;
    fetchC74Price().then((p) => { if (active) setPrice(p); });
    return () => { active = false; };
  }, []);
  return price;
}
