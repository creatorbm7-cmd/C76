/**
 * C7Winner — Next-Gen Neon Aqua Casino Royale Design Tokens
 *
 * Single source of truth for the premium casino theme.
 * Combines: Dark Luxury Casino Royale + Neon Aqua Live Gaming Arena
 *           + VIP Reward Ecosystem + Cinematic Mobile Casino UI.
 *
 * Mobile-first, max-width 430px, 60fps animation budget.
 * Import via `import { c7Theme } from "@/theme/c7-neon-aqua"`.
 */

// ────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM
// ────────────────────────────────────────────────────────────────────────────

/**
 * R5 "Temple of the Jade Jaguar" — token VALUES repointed to the jade/copper/
 * stone palette. Keys are unchanged so every consumer keeps working; this is a
 * pure value swap (no structural / geometry change). The `aqua` key now holds
 * jade (kept for back-compat), `copper` is the new temple-metal ramp, and gold
 * is reserved for glyphs / numerals / jackpot per the Design Bible.
 */
export const c7Colors = {
  // Surface / background — jungle night + carved stone
  surface: {
    abyss: "#05100b",        // deepest jungle
    void: "#0a140f",         // ground
    deep: "#12201a",         // raised surface (stone-900)
    raised: "#1a2c22",       // card body (stone-800)
    elevated: "#213629",     // hover / active (stone-700)
    glass: "rgba(26, 44, 34, 0.55)",   // glassmorphism fill
    glassLight: "rgba(44, 70, 52, 0.42)",
  },

  // Jade (primary accent) — key kept as `aqua` for back-compat
  aqua: {
    50:  "#e6fbf1",
    100: "#c2f3dc",
    200: "#92e9be",
    300: "#5fdda0",
    400: "#37e29a",
    500: "#21c07e",   // 🔥 hero jade
    600: "#159861",
    700: "#0f7a4e",
    800: "#0a5638",
    900: "#063823",
    glow: "rgba(47, 226, 154, 0.55)",
    glowSoft: "rgba(47, 226, 154, 0.20)",
  },

  // Copper (temple metal — secondary accent / ornament)
  copper: {
    300: "#eeb488",
    400: "#e49a5a",
    500: "#c6763a",
    600: "#a85e2c",
    700: "#7c421d",
    glow: "rgba(226, 154, 90, 0.45)",
    glowSoft: "rgba(226, 154, 90, 0.18)",
  },

  // Ancient gold — glyphs, numerals, jackpot & rare rewards only
  gold: {
    50:  "#fbf3d8",
    100: "#f6e6b0",
    200: "#efd488",
    300: "#e8c15a",   // ancient gold
    400: "#d9a94a",   // primary gold-glyph
    500: "#c68a2e",
    600: "#a06e1f",
    700: "#7a5217",
    800: "#553811",
    900: "#2e1e09",
    glow: "rgba(232, 193, 90, 0.55)",
    glowSoft: "rgba(232, 193, 90, 0.18)",
  },

  // Ruby / coral (win, danger, jackpot, live)
  ruby: {
    400: "#f0846e",
    500: "#e8604c",
    600: "#c8402c",
    glow: "rgba(232, 96, 76, 0.55)",
  },

  // Emerald (secondary success) — aligned to jade
  emerald: {
    400: "#37e29a",
    500: "#21c07e",
    600: "#159861",
    glow: "rgba(47, 226, 154, 0.5)",
  },

  // Text — mist
  text: {
    primary: "#dce8df",
    secondary: "#9db3a4",
    tertiary: "#64796b",
    muted: "#45564b",
    onAccent: "#05100b",
  },

  // Borders
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    soft: "rgba(255, 255, 255, 0.1)",
    medium: "rgba(255, 255, 255, 0.16)",
    aqua: "rgba(47, 226, 154, 0.3)",
    copper: "rgba(226, 154, 90, 0.35)",
    gold: "rgba(232, 193, 90, 0.35)",
  },

  // Status
  status: {
    online: "#21c07e",
    live: "#e8604c",
    pending: "#e8c15a",
    offline: "#45564b",
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GRADIENTS
// ────────────────────────────────────────────────────────────────────────────

export const c7Gradients = {
  background: "radial-gradient(ellipse at top, rgba(47, 226, 154, 0.06) 0%, rgba(10, 20, 15, 1) 60%)",
  hero: "linear-gradient(135deg, #21c07e 0%, #c6763a 100%)",
  goldBar: "linear-gradient(135deg, #e8c15a 0%, #c68a2e 50%, #f6e6b0 100%)",
  aquaBar: "linear-gradient(135deg, #37e29a 0%, #21c07e 50%, #0a5638 100%)",
  vip: "linear-gradient(135deg, #e8c15a 0%, #c6763a 50%, #21c07e 100%)",
  cardGlass: "linear-gradient(135deg, rgba(44, 70, 52, 0.5) 0%, rgba(26, 44, 34, 0.6) 100%)",
  jackpot: "linear-gradient(135deg, #e8c15a 0%, #c6763a 50%, #e8604c 100%)",
  meshOverlay:
    "radial-gradient(circle at 20% 30%, rgba(47, 226, 154, 0.12) 0%, transparent 50%), " +
    "radial-gradient(circle at 80% 70%, rgba(226, 154, 90, 0.1) 0%, transparent 50%), " +
    "radial-gradient(circle at 50% 100%, rgba(232, 96, 76, 0.08) 0%, transparent 50%)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GLOW / SHADOW UTILITIES
// ────────────────────────────────────────────────────────────────────────────

export const c7Glow = {
  aqua:    "0 0 24px rgba(47, 226, 154, 0.45), 0 0 8px rgba(47, 226, 154, 0.6)",
  aquaSm:  "0 0 12px rgba(47, 226, 154, 0.35)",
  aquaLg:  "0 0 48px rgba(47, 226, 154, 0.5), 0 0 16px rgba(47, 226, 154, 0.7)",
  gold:    "0 0 24px rgba(232, 193, 90, 0.45), 0 0 8px rgba(232, 193, 90, 0.6)",
  goldSm:  "0 0 12px rgba(232, 193, 90, 0.35)",
  goldLg:  "0 0 48px rgba(232, 193, 90, 0.5), 0 0 16px rgba(232, 193, 90, 0.7)",
  ruby:    "0 0 24px rgba(232, 96, 76, 0.5)",
  emerald: "0 0 24px rgba(47, 226, 154, 0.45)",
  none:    "none",
} as const;

export const c7Shadow = {
  card:     "0 4px 24px rgba(0, 0, 0, 0.4), 0 1px 0 rgba(255, 255, 255, 0.04) inset",
  cardHover:"0 8px 32px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 255, 255, 0.08) inset",
  modal:    "0 20px 60px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1) inset",
  raised:   "0 2px 12px rgba(0, 0, 0, 0.35)",
  inner:    "inset 0 1px 0 rgba(255, 255, 255, 0.05), inset 0 -1px 0 rgba(0, 0, 0, 0.4)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY
// ────────────────────────────────────────────────────────────────────────────

export const c7Type = {
  family: {
    display: '"Orbitron", "Space Grotesk", system-ui, sans-serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  size: {
    xs:   "11px",
    sm:   "12px",
    base: "14px",
    md:   "15px",
    lg:   "17px",
    xl:   "20px",
    "2xl":"24px",
    "3xl":"32px",
    "4xl":"40px",
    hero: "56px",
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    black: 900,
  },
  tracking: {
    tight: "-0.02em",
    normal: "0",
    wide: "0.02em",
    wider: "0.06em",
    widest: "0.12em",
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SPACING (8-pt grid)
// ────────────────────────────────────────────────────────────────────────────

export const c7Space = {
  0:   "0",
  1:   "4px",
  2:   "8px",
  3:   "12px",
  4:   "16px",
  5:   "20px",
  6:   "24px",
  8:   "32px",
  10:  "40px",
  12:  "48px",
  16:  "64px",
  20:  "80px",
  24:  "96px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// RADII
// ────────────────────────────────────────────────────────────────────────────

export const c7Radius = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  "2xl": "28px",
  pill: "999px",
  card: "20px",       // standard casino card
  modal: "24px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// MOTION (Framer Motion variants)
// ────────────────────────────────────────────────────────────────────────────

export const c7Motion = {
  // Timing
  duration: {
    instant: 0.08,
    fast: 0.18,
    base: 0.28,
    slow: 0.42,
    slowest: 0.7,
  },
  // Easing (cubic-bezier)
  ease: {
    out:    [0.16, 1, 0.3, 1] as const,        // smooth out
    in:     [0.7, 0, 0.84, 0] as const,
    inOut:  [0.65, 0, 0.35, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,    // playful overshoot
    linear: [0, 0, 1, 1] as const,
  },

  // Card entrance (stagger children)
  cardEntrance: {
    initial: { opacity: 0, y: 16, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  },

  // Modal
  modal: {
    initial: { opacity: 0, scale: 0.92, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.96, y: 8 },
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  },

  // Ticker (continuous horizontal scroll)
  ticker: {
    animate: { x: ["0%", "-50%"] },
    transition: { duration: 30, ease: "linear" as const, repeat: Infinity },
  },

  // Pulse (live badge)
  pulse: {
    animate: { opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
  },

  // Glow pulse (CTA buttons)
  glowPulse: {
    animate: {
      boxShadow: [
        "0 0 8px rgba(47, 226, 154, 0.4)",
        "0 0 24px rgba(47, 226, 154, 0.7)",
        "0 0 8px rgba(47, 226, 154, 0.4)",
      ],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
  },

  // Card hover
  cardHover: {
    whileHover: { y: -4, scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
  },

  // Jackpot counter flip
  counter: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },

  // Stagger container
  stagger: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Z-INDEX LAYERS
// ────────────────────────────────────────────────────────────────────────────

export const c7Layer = {
  base: 0,
  raised: 1,
  sticky: 10,
  dropdown: 20,
  navigation: 30,
  modal: 40,
  toast: 50,
  popover: 60,
  tooltip: 70,
  splash: 100,
} as const;

// ────────────────────────────────────────────────────────────────────────────
// BREAKPOINTS (mobile-first)
// ────────────────────────────────────────────────────────────────────────────

export const c7Breakpoint = {
  sm: "430px",   // mobile (primary target)
  md: "768px",   // tablet
  lg: "1024px",  // small desktop (admin uses this)
  xl: "1280px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// VIP TIER (theme accents per tier — matches existing Profile.tsx pattern)
// ────────────────────────────────────────────────────────────────────────────

export const c7VipTier = {
  bronze:   { accent: "#cd7f32", glow: c7Glow.gold,  label: "Bronze" },
  silver:   { accent: "#c0c0c0", glow: "0 0 24px rgba(192, 192, 192, 0.5)", label: "Silver" },
  gold:     { accent: c7Colors.gold[400], glow: c7Glow.gold,  label: "Gold" },
  platinum: { accent: "#e5e7eb", glow: "0 0 24px rgba(229, 231, 235, 0.55)", label: "Platinum" },
  diamond:  { accent: c7Colors.aqua[500], glow: c7Glow.aqua, label: "Diamond" },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SOUND CATALOGUE (placeholder URLs — replace with real assets)
// ────────────────────────────────────────────────────────────────────────────

export const c7Sound = {
  intro:        "/sounds/intro-theme.mp3",
  buttonClick:  "/sounds/click.mp3",
  jackpot:      "/sounds/jackpot.mp3",
  winCelebrate: "/sounds/win.mp3",
  notification: "/sounds/notification.mp3",
  spinStart:    "/sounds/spin-start.mp3",
  spinEnd:      "/sounds/spin-end.mp3",
  coin:         "/sounds/coin.mp3",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT
// ────────────────────────────────────────────────────────────────────────────

export const c7Theme = {
  name: "C7Winner — Neon Aqua Casino Royale",
  version: "1.0.0",
  colors: c7Colors,
  gradients: c7Gradients,
  glow: c7Glow,
  shadow: c7Shadow,
  type: c7Type,
  space: c7Space,
  radius: c7Radius,
  motion: c7Motion,
  layer: c7Layer,
  breakpoint: c7Breakpoint,
  vipTier: c7VipTier,
  sound: c7Sound,
} as const;

export type C7Theme = typeof c7Theme;
export default c7Theme;
