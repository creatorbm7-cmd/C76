/**
 * C7Winner — Sun27 Dark Casino Royale Design Tokens (V3)
 *
 * Parallel theme to c7-neon-aqua.ts.
 * Aesthetic: Dark luxury casino + warm gold + ruby red accents.
 * Inspired by classic premium casino apps (sun27 reference) — end-to-end
 * onboarding flow per the C7Winner User Journey mockup.
 *
 * Same token shape as c7Theme so components can swap by changing imports.
 * Mobile-first, max-width 430px, 60fps animation budget.
 * Import via `import { c7Sun27Theme } from "@/theme/c7-sun27-dark"`.
 */

// ────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM (Dark + Amber Gold + Ruby Red)
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Colors = {
  // Surface / background — warm dark, not cold
  surface: {
    abyss: "#0c0519",          // deepest background (violet void)
    void: "#120829",           // primary background
    deep: "#1a0b3d",           // raised surface
    raised: "#241252",         // card body
    elevated: "#2a1560",       // hover / active
    glass: "rgba(42, 21, 96, 0.62)",     // glassmorphism fill
    glassLight: "rgba(58, 38, 96, 0.45)",
  },

  // Amber gold (primary accent — replaces aqua role)
  gold: {
    50:  "#fff8e6",
    100: "#fff0c2",
    200: "#ffe48a",
    300: "#ffd95c",
    400: "#ffc940",
    500: "#ffb800",            // 🔥 hero gold
    600: "#e6a200",
    700: "#b88000",
    800: "#805900",
    900: "#4d3500",
    glow: "rgba(255, 184, 0, 0.55)",
    glowSoft: "rgba(255, 184, 0, 0.20)",
  },

  // Amber (secondary warm tone)
  amber: {
    400: "#ffb84d",
    500: "#ff9d2e",
    600: "#e07a00",
    glow: "rgba(255, 157, 46, 0.5)",
  },

  // Ruby → retinted to Yono hot pink (CTA, jackpot banner, win)
  ruby: {
    300: "#ffb366",
    400: "#ffa64d",
    500: "#ff8c00",            // 🔥 Yono hot pink
    600: "#b35900",
    700: "#7a3a00",
    glow: "rgba(255,140,0, 0.55)",
    glowSoft: "rgba(255,140,0, 0.20)",
  },

  // Emerald (success, online status, "PLAY" button)
  emerald: {
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    glow: "rgba(16, 185, 129, 0.5)",
  },

  // Text — warm white tones over dark warm bg
  text: {
    primary: "#fffaf0",
    secondary: "#d4c4a8",
    tertiary: "#998a72",
    muted: "#5a4d3a",
    onAccent: "#120829",       // dark text on gold buttons
  },

  // Borders — warm subtle
  border: {
    subtle: "rgba(255, 230, 180, 0.06)",
    soft: "rgba(255, 230, 180, 0.12)",
    medium: "rgba(255, 230, 180, 0.20)",
    gold: "rgba(255, 184, 0, 0.35)",
    ruby: "rgba(255,140,0, 0.35)",
  },

  // Status
  status: {
    online: "#10b981",
    live: "#ff8c00",
    pending: "#ffb800",
    offline: "#5a4d3a",
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GRADIENTS
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Gradients = {
  background: "radial-gradient(ellipse at top, rgba(255,140,0, 0.10) 0%, rgba(18, 8, 41, 1) 60%)",
  hero: "linear-gradient(135deg, #ff8c00 0%, #ffc83d 100%)",
  goldBar: "linear-gradient(135deg, #ffd95c 0%, #ffb800 50%, #e6a200 100%)",
  rubyBar: "linear-gradient(135deg, #ffa64d 0%, #ff8c00 50%, #7a3a00 100%)",
  vip: "linear-gradient(135deg, #ffb800 0%, #ff8c00 50%, #ffc940 100%)",
  cardGlass: "linear-gradient(135deg, rgba(58, 38, 96, 0.55) 0%, rgba(42, 21, 96, 0.65) 100%)",
  jackpot: "linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ff8c00 100%)",
  welcomeRibbon: "linear-gradient(90deg, #7a3a00 0%, #ff8c00 50%, #7a3a00 100%)",
  meshOverlay:
    "radial-gradient(circle at 20% 30%, rgba(255,140,0, 0.14) 0%, transparent 50%), " +
    "radial-gradient(circle at 80% 70%, rgba(0, 229, 255, 0.10) 0%, transparent 50%), " +
    "radial-gradient(circle at 50% 100%, rgba(255, 200, 61, 0.08) 0%, transparent 50%)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GLOW / SHADOW UTILITIES
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Glow = {
  gold:    "0 0 24px rgba(255, 184, 0, 0.50), 0 0 8px rgba(255, 184, 0, 0.65)",
  goldSm:  "0 0 12px rgba(255, 184, 0, 0.40)",
  goldLg:  "0 0 48px rgba(255, 184, 0, 0.55), 0 0 16px rgba(255, 184, 0, 0.70)",
  ruby:    "0 0 24px rgba(255,140,0, 0.55), 0 0 8px rgba(255,140,0, 0.65)",
  rubySm:  "0 0 12px rgba(255,140,0, 0.40)",
  rubyLg:  "0 0 48px rgba(255,140,0, 0.6), 0 0 16px rgba(255,140,0, 0.75)",
  amber:   "0 0 24px rgba(255, 157, 46, 0.5)",
  emerald: "0 0 24px rgba(16, 185, 129, 0.45)",
  none:    "none",
} as const;

export const c7Sun27Shadow = {
  card:      "0 4px 24px rgba(0, 0, 0, 0.5), 0 1px 0 rgba(255, 230, 180, 0.05) inset",
  cardHover: "0 8px 32px rgba(0, 0, 0, 0.6), 0 1px 0 rgba(255, 230, 180, 0.10) inset",
  modal:     "0 24px 64px rgba(0, 0, 0, 0.75), 0 0 1px rgba(255, 230, 180, 0.12) inset",
  raised:    "0 2px 12px rgba(0, 0, 0, 0.45)",
  inner:     "inset 0 1px 0 rgba(255, 230, 180, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.5)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY (matches c7-neon-aqua structure)
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Type = {
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

export const c7Sun27Space = {
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

export const c7Sun27Radius = {
  none: "0",
  sm: "6px",
  md: "10px",
  lg: "14px",
  xl: "20px",
  "2xl": "28px",
  pill: "999px",
  card: "20px",
  modal: "24px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// MOTION
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Motion = {
  duration: {
    instant: 0.08,
    fast: 0.18,
    base: 0.28,
    slow: 0.42,
    slowest: 0.7,
  },
  ease: {
    out:    [0.16, 1, 0.3, 1] as const,
    in:     [0.7, 0, 0.84, 0] as const,
    inOut:  [0.65, 0, 0.35, 1] as const,
    bounce: [0.34, 1.56, 0.64, 1] as const,
    linear: [0, 0, 1, 1] as const,
  },

  cardEntrance: {
    initial: { opacity: 0, y: 16, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] as const },
  },

  modal: {
    initial: { opacity: 0, scale: 0.92, y: 12 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit:    { opacity: 0, scale: 0.96, y: 8 },
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const },
  },

  ticker: {
    animate: { x: ["0%", "-50%"] },
    transition: { duration: 30, ease: "linear" as const, repeat: Infinity },
  },

  pulse: {
    animate: { opacity: [0.6, 1, 0.6], scale: [1, 1.05, 1] },
    transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const },
  },

  glowPulseGold: {
    animate: {
      boxShadow: [
        "0 0 8px rgba(255, 184, 0, 0.4)",
        "0 0 24px rgba(255, 184, 0, 0.75)",
        "0 0 8px rgba(255, 184, 0, 0.4)",
      ],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
  },

  glowPulseRuby: {
    animate: {
      boxShadow: [
        "0 0 8px rgba(255,140,0, 0.4)",
        "0 0 24px rgba(255,140,0, 0.75)",
        "0 0 8px rgba(255,140,0, 0.4)",
      ],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
  },

  cardHover: {
    whileHover: { y: -4, scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as const },
  },

  counter: {
    initial: { y: 20, opacity: 0 },
    animate: { y: 0, opacity: 1 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as const },
  },

  stagger: {
    animate: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// Z-INDEX LAYERS
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Layer = {
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
// BREAKPOINTS
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Breakpoint = {
  sm: "430px",
  md: "768px",
  lg: "1024px",
  xl: "1280px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// VIP TIER (warm accents)
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27VipTier = {
  bronze:   { accent: "#cd7f32", glow: c7Sun27Glow.amber, label: "Bronze" },
  silver:   { accent: "#c0c0c0", glow: "0 0 24px rgba(192, 192, 192, 0.5)", label: "Silver" },
  gold:     { accent: c7Sun27Colors.gold[500], glow: c7Sun27Glow.gold, label: "Gold" },
  platinum: { accent: "#e5e7eb", glow: "0 0 24px rgba(229, 231, 235, 0.55)", label: "Platinum" },
  diamond:  { accent: "#ffb366", glow: c7Sun27Glow.ruby, label: "Diamond" },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SOUND CATALOGUE (placeholder paths — same as aqua theme)
// ────────────────────────────────────────────────────────────────────────────

export const c7Sun27Sound = {
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

export const c7Sun27Theme = {
  name: "C7Winner — Sun27 Dark Casino Royale",
  version: "3.0.0",
  colors: c7Sun27Colors,
  gradients: c7Sun27Gradients,
  glow: c7Sun27Glow,
  shadow: c7Sun27Shadow,
  type: c7Sun27Type,
  space: c7Sun27Space,
  radius: c7Sun27Radius,
  motion: c7Sun27Motion,
  layer: c7Sun27Layer,
  breakpoint: c7Sun27Breakpoint,
  vipTier: c7Sun27VipTier,
  sound: c7Sun27Sound,
} as const;

export type C7Sun27Theme = typeof c7Sun27Theme;
export default c7Sun27Theme;
