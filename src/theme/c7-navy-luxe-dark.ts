/**
 * C7Winner — Navy Luxe Dark Design Tokens (V4)
 *
 * Premium yacht-club palette: midnight navy + soft champagne gold +
 * pearl + deep burgundy. Replacement for sun27 (bright gold + ruby).
 *
 * Same export SHAPE as c7-sun27-dark.ts so the compat layer can swap
 * to this theme by changing one import path. All key names preserved
 * (gold.500, ruby.500, amber.*, emerald.*) — only values change.
 *
 * Semantic note: the legacy names are kept for compatibility:
 *   - colors.gold.*  → soft champagne gold (was bright gold)
 *   - colors.ruby.*  → deep burgundy        (was bright ruby red)
 *   - colors.amber.* → pearl / cream        (was warm amber)
 *   - colors.emerald.* → unchanged (status / online indicator)
 *
 * Mobile-first, max-width 430px, 60fps animation budget.
 */

// ────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM (Midnight Navy + Soft Champagne + Pearl + Burgundy)
// ────────────────────────────────────────────────────────────────────────────

export const c7NavyColors = {
  // Surface / background — deep midnight navy
  surface: {
    abyss: "#060914",          // deepest background (navy-black)
    void: "#0B1020",           // primary background (midnight navy)
    deep: "#141821",           // raised surface (navy)
    raised: "#162d52",         // card body
    elevated: "#1d3a68",       // hover / active
    glass: "rgba(22, 45, 82, 0.62)",          // glassmorphism fill (navy tinted)
    glassLight: "rgba(40, 70, 120, 0.45)",
  },

  // Soft champagne gold (primary accent — matte, not bright)
  gold: {
    50:  "#f9f3e2",
    100: "#f0e3c2",
    200: "#e4d199",
    300: "#d8be7e",
    400: "#c9a96e",
    500: "#b89859",            // 🔥 soft champagne (was bright #ffb800)
    600: "#9c7e43",
    700: "#7d6232",
    800: "#594623",
    900: "#332714",
    glow: "rgba(184, 152, 89, 0.55)",
    glowSoft: "rgba(184, 152, 89, 0.20)",
  },

  // Pearl / cream (secondary highlight — was amber)
  amber: {
    400: "#e8dfca",
    500: "#dcd1b6",            // pearl cream (was bright amber)
    600: "#b8ac8c",
    glow: "rgba(232, 223, 202, 0.5)",
  },

  // Deep burgundy (CTA, jackpot, win — was ruby red)
  ruby: {
    300: "#a8546a",
    400: "#8b3a4a",
    500: "#5C2233",            // 🔥 deep burgundy (was bright #ef2a4c)
    600: "#5a2230",
    700: "#3f1622",
    glow: "rgba(92, 34, 51, 0.55)",
    glowSoft: "rgba(92, 34, 51, 0.20)",
  },

  // Emerald (status — unchanged from sun27, still valid)
  emerald: {
    400: "#34d399",
    500: "#10b981",
    600: "#059669",
    glow: "rgba(16, 185, 129, 0.5)",
  },

  // Text — pearl tones on navy
  text: {
    primary: "#f4ede0",        // pearl white
    secondary: "#c8bca5",
    tertiary: "#8a8068",
    muted: "#4d4534",
    onAccent: "#0B1020",       // navy text on light buttons
  },

  // Borders — pearl-tinted subtle edges
  border: {
    subtle: "rgba(244, 237, 224, 0.06)",
    soft: "rgba(244, 237, 224, 0.12)",
    medium: "rgba(244, 237, 224, 0.20)",
    gold: "rgba(184, 152, 89, 0.35)",
    ruby: "rgba(92, 34, 51, 0.35)",
  },

  // Status
  status: {
    online: "#10b981",
    live: "#8b3a4a",           // burgundy live indicator
    pending: "#b89859",        // champagne pending
    offline: "#4d4534",
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GRADIENTS
// ────────────────────────────────────────────────────────────────────────────

export const c7NavyGradients = {
  background: "radial-gradient(ellipse at top, rgba(184, 152, 89, 0.06) 0%, rgba(10, 20, 40, 1) 60%)",
  hero: "linear-gradient(135deg, #c9a96e 0%, #5C2233 100%)",
  goldBar: "linear-gradient(135deg, #d8be7e 0%, #b89859 50%, #7d6232 100%)",
  rubyBar: "linear-gradient(135deg, #a8546a 0%, #5C2233 50%, #3f1622 100%)",
  vip: "linear-gradient(135deg, #b89859 0%, #5C2233 50%, #d8be7e 100%)",
  cardGlass: "linear-gradient(135deg, rgba(40, 70, 120, 0.55) 0%, rgba(22, 45, 82, 0.65) 100%)",
  jackpot: "linear-gradient(135deg, #e4d199 0%, #9c7e43 50%, #5C2233 100%)",
  welcomeRibbon: "linear-gradient(90deg, #3f1622 0%, #5C2233 50%, #3f1622 100%)",
  meshOverlay:
    "radial-gradient(circle at 20% 30%, rgba(184, 152, 89, 0.14) 0%, transparent 50%), " +
    "radial-gradient(circle at 80% 70%, rgba(92, 34, 51, 0.10) 0%, transparent 50%), " +
    "radial-gradient(circle at 50% 100%, rgba(232, 223, 202, 0.08) 0%, transparent 50%)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GLOW / SHADOW UTILITIES
// ────────────────────────────────────────────────────────────────────────────

export const c7NavyGlow = {
  gold:    "0 0 24px rgba(184, 152, 89, 0.50), 0 0 8px rgba(184, 152, 89, 0.65)",
  goldSm:  "0 0 12px rgba(184, 152, 89, 0.40)",
  goldLg:  "0 0 48px rgba(184, 152, 89, 0.55), 0 0 16px rgba(184, 152, 89, 0.70)",
  ruby:    "0 0 24px rgba(92, 34, 51, 0.55), 0 0 8px rgba(92, 34, 51, 0.65)",
  rubySm:  "0 0 12px rgba(92, 34, 51, 0.40)",
  rubyLg:  "0 0 48px rgba(92, 34, 51, 0.6), 0 0 16px rgba(92, 34, 51, 0.75)",
  amber:   "0 0 24px rgba(232, 223, 202, 0.4)",
  emerald: "0 0 24px rgba(16, 185, 129, 0.45)",
  none:    "none",
} as const;

export const c7NavyShadow = {
  card:      "0 4px 24px rgba(0, 0, 0, 0.55), 0 1px 0 rgba(244, 237, 224, 0.05) inset",
  cardHover: "0 8px 32px rgba(0, 0, 0, 0.65), 0 1px 0 rgba(244, 237, 224, 0.10) inset",
  modal:     "0 24px 64px rgba(0, 0, 0, 0.80), 0 0 1px rgba(244, 237, 224, 0.12) inset",
  raised:    "0 2px 12px rgba(0, 0, 0, 0.50)",
  inner:     "inset 0 1px 0 rgba(244, 237, 224, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.55)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY (same scale as sun27)
// ────────────────────────────────────────────────────────────────────────────

export const c7NavyType = {
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
// SPACING / RADII / MOTION / LAYERS / BREAKPOINTS — unchanged from sun27
// ────────────────────────────────────────────────────────────────────────────

export const c7NavySpace = {
  0: "0", 1: "4px", 2: "8px", 3: "12px", 4: "16px", 5: "20px", 6: "24px",
  8: "32px", 10: "40px", 12: "48px", 16: "64px", 20: "80px", 24: "96px",
} as const;

export const c7NavyRadius = {
  none: "0", sm: "6px", md: "10px", lg: "14px", xl: "20px",
  "2xl": "28px", pill: "999px", card: "20px", modal: "24px",
} as const;

export const c7NavyMotion = {
  duration: { instant: 0.08, fast: 0.18, base: 0.28, slow: 0.42, slowest: 0.7 },
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
        "0 0 8px rgba(184, 152, 89, 0.4)",
        "0 0 24px rgba(184, 152, 89, 0.75)",
        "0 0 8px rgba(184, 152, 89, 0.4)",
      ],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
  },
  glowPulseRuby: {
    animate: {
      boxShadow: [
        "0 0 8px rgba(92, 34, 51, 0.4)",
        "0 0 24px rgba(92, 34, 51, 0.75)",
        "0 0 8px rgba(92, 34, 51, 0.4)",
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

export const c7NavyLayer = {
  base: 0, raised: 1, sticky: 10, dropdown: 20, navigation: 30,
  modal: 40, toast: 50, popover: 60, tooltip: 70, splash: 100,
} as const;

export const c7NavyBreakpoint = {
  sm: "430px", md: "768px", lg: "1024px", xl: "1280px",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// VIP TIER (navy-aligned accents)
// ────────────────────────────────────────────────────────────────────────────

export const c7NavyVipTier = {
  bronze:   { accent: "#a87349", glow: c7NavyGlow.amber, label: "Bronze" },
  silver:   { accent: "#b8b8b8", glow: "0 0 24px rgba(184, 184, 184, 0.5)", label: "Silver" },
  gold:     { accent: c7NavyColors.gold[500], glow: c7NavyGlow.gold, label: "Gold" },
  platinum: { accent: "#dde0e8", glow: "0 0 24px rgba(221, 224, 232, 0.55)", label: "Platinum" },
  diamond:  { accent: "#a8546a", glow: c7NavyGlow.ruby, label: "Diamond" },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// SOUND CATALOGUE — unchanged
// ────────────────────────────────────────────────────────────────────────────

export const c7NavySound = {
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

export const c7NavyTheme = {
  name: "C7Winner — Navy Luxe Dark",
  version: "4.0.0",
  colors: c7NavyColors,
  gradients: c7NavyGradients,
  glow: c7NavyGlow,
  shadow: c7NavyShadow,
  type: c7NavyType,
  space: c7NavySpace,
  radius: c7NavyRadius,
  motion: c7NavyMotion,
  layer: c7NavyLayer,
  breakpoint: c7NavyBreakpoint,
  vipTier: c7NavyVipTier,
  sound: c7NavySound,
} as const;

export type C7NavyTheme = typeof c7NavyTheme;
export default c7NavyTheme;
