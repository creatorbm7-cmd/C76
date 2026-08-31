// Centralized number / currency formatting.
//
// Before this module, ~30 screens each declared their own inline
// `toLocaleString(...)` helper (usd / inr / fmt). They diverged subtly in
// locale (en-US vs en-IN vs the device default) and in fraction digits
// (0 / 2 / 6). These helpers reproduce every one of those behaviors exactly,
// so migrating a call site produces byte-identical output — locale and
// decimals stay configurable per call. Centralizing them also makes a future
// locale / i18n change a one-file edit.

export type FormatOpts = {
  /**
   * BCP-47 locale. Omit for "en-US" (the app default). Pass `null` to use the
   * runtime / device default locale (mirrors the old `toLocaleString(undefined, …)`
   * call sites, which are locale-aware by design).
   */
  locale?: string | null;
  /** minimumFractionDigits (omit to let Intl default it to 0). */
  min?: number;
  /** maximumFractionDigits. */
  max?: number;
};

// null => device/runtime locale; undefined/omitted => "en-US".
function resolveLocale(locale: string | null | undefined): string | undefined {
  if (locale === null) return undefined;
  return locale ?? "en-US";
}

function format(n: number, { locale, min, max }: FormatOpts): string {
  return Number(n ?? 0).toLocaleString(resolveLocale(locale), {
    minimumFractionDigits: min,
    maximumFractionDigits: max,
  });
}

/** Plain grouped number. Defaults to en-US with 0 decimals. */
export const num = (n: number, opts: FormatOpts = {}): string =>
  format(n, { max: 0, ...opts });

/** US dollar amount, e.g. `$1,234.5`. Defaults to en-US, up to 2 decimals. */
export const usd = (n: number, opts: FormatOpts = {}): string =>
  "$" + format(n, { max: 2, ...opts });

/** Indian rupee amount, e.g. `₹1,23,456.78`. Defaults to en-IN, up to 2 decimals. */
export const inr = (n: number, opts: FormatOpts = {}): string =>
  "₹" + format(n, { locale: "en-IN", max: 2, ...opts });

/** Percentage, e.g. `12.5%`. Defaults to en-US, up to 1 decimal. */
export const pct = (n: number, opts: FormatOpts = {}): string =>
  format(n, { max: 1, ...opts }) + "%";
