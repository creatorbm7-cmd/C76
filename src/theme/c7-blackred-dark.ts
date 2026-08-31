/**
 * C7Winner — Black/Red Dark Design Tokens (V5)
 *
 * BC.Game / Roobet aesthetic: pure black + hot brand red + warm gold
 * for prize/jackpot callouts. Replacement for Navy Luxe (v4).
 *
 * Same export SHAPE as c7-navy-luxe-dark.ts so the compat layer can
 * swap to this theme by changing one import path. Legacy token names
 * (gold.500, ruby.500, amber.500) preserved — only values change.
 *
 * Semantic mapping:
 *   colors.gold.*    → BC.Game brand red       (dominant accent)
 *   colors.ruby.*    → hot pop red             (CTA, more saturated)
 *   colors.amber.*   → warm gold               (jackpot / prize callouts)
 *   colors.emerald.* → unchanged               (win status indicator)
 *   colors.surface.* → pure black scale        (was navy)
 *
 * The gold→red rename at the token layer keeps 35+ consumer components
 * compiling unchanged. New reader caveat: `gold.500` now literally
 * holds the BC.Game red `#ff8c00`. Rename pass deferred to a separate
 * refactor.
 */

// ────────────────────────────────────────────────────────────────────────────
// COLOR SYSTEM (Pure Black + Hot Brand Red + Warm Prize Gold)
// ────────────────────────────────────────────────────────────────────────────

export const c7BlackRedColors = {
  // Surface — pure black scale, the BC.Game / Roobet hallmark
  surface: {
    abyss: "#000000",          // pure black
    void: "#0a0a0c",           // primary background (near-black)
    deep: "#141417",           // raised surface
    raised: "#1c1c20",         // card body
    elevated: "#26262b",       // hover / active
    glass: "rgba(28, 28, 32, 0.62)",
    glassLight: "rgba(45, 45, 52, 0.45)",
  },

  // C7 brand GREEN — dominant accent (token name kept as `gold` for compat)
  gold: {
    50:  "#d7f7e6",
    100: "#b6f0d0",
    200: "#7fe3ac",
    300: "#3fd888",
    400: "#22e07a",
    500: "#1ec46a",            // 🟢 C7 brand green
    600: "#0b7a3f",
    700: "#0a5c30",
    800: "#083d22",
    900: "#052616",
    glow: "rgba(30,196,106, 0.55)",
    glowSoft: "rgba(30,196,106, 0.20)",
  },

  // Warm gold (prize / jackpot semantic — was amber)
  amber: {
    400: "#ffd97a",
    500: "#ffc83d",            // gold for prize callouts
    600: "#ffc83d",
    glow: "rgba(255,200,61, 0.55)",
  },

  // Hot pop GREEN — high-intensity CTA (token name kept as `ruby` for compat)
  ruby: {
    300: "#7fe3ac",
    400: "#22e07a",
    500: "#1ec46a",            // 🟢 hot CTA green
    600: "#0b7a3f",
    700: "#0a5c30",
    glow: "rgba(30,196,106, 0.55)",
    glowSoft: "rgba(30,196,106, 0.20)",
  },

  // Win / positive status — GREEN
  emerald: {
    400: "#3fd888",
    500: "#1ec46a",
    600: "#0b7a3f",
    glow: "rgba(30,196,106, 0.5)",
  },

  // Text — white tones on pure black
  text: {
    primary: "#ffffff",
    secondary: "#c0c0c4",
    tertiary: "#8a8a8e",
    muted: "#5a5a5e",
    onAccent: "#ffffff",       // white text on red buttons
  },

  // Borders — subtle white edges (the BC.Game card vibe)
  border: {
    subtle: "rgba(255, 255, 255, 0.06)",
    soft: "rgba(255, 255, 255, 0.12)",
    medium: "rgba(255, 255, 255, 0.20)",
    gold: "rgba(30,196,106, 0.35)",  // brand green edge
    ruby: "rgba(30,196,106, 0.35)",  // hot green edge
  },

  // Status
  status: {
    online: "#1ec46a",
    live: "#1ec46a",           // green live indicator
    pending: "#ffc83d",        // gold pending
    offline: "#5a5a5e",
  },
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GRADIENTS
// ────────────────────────────────────────────────────────────────────────────

export const c7BlackRedGradients = {
  background: "radial-gradient(ellipse at top, rgba(30,196,106, 0.10) 0%, rgba(0, 0, 0, 1) 60%)",
  hero: "linear-gradient(135deg, #1ec46a 0%, #0b7a3f 100%)",
  goldBar: "linear-gradient(135deg, #22e07a 0%, #1ec46a 50%, #0a5c30 100%)",
  rubyBar: "linear-gradient(135deg, #1ec46a 0%, #0b7a3f 50%, #0a5c30 100%)",
  vip: "linear-gradient(135deg, #ffc83d 0%, #ffe9a8 50%, #ffc83d 100%)",
  cardGlass: "linear-gradient(135deg, rgba(45, 45, 52, 0.55) 0%, rgba(20, 20, 23, 0.65) 100%)",
  jackpot: "linear-gradient(135deg, #ffd97a 0%, #ffc83d 30%, #f4b400 100%)",
  welcomeRibbon: "linear-gradient(90deg, #0a5c30 0%, #1ec46a 50%, #0a5c30 100%)",
  meshOverlay:
    "radial-gradient(circle at 20% 30%, rgba(30,196,106, 0.14) 0%, transparent 50%), " +
    "radial-gradient(circle at 80% 70%, rgba(30,196,106, 0.10) 0%, transparent 50%), " +
    "radial-gradient(circle at 50% 100%, rgba(255,200,61, 0.08) 0%, transparent 50%)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// GLOW / SHADOW
// ────────────────────────────────────────────────────────────────────────────

export const c7BlackRedGlow = {
  gold:    "0 0 24px rgba(30,196,106, 0.55), 0 0 8px rgba(30,196,106, 0.65)",
  goldSm:  "0 0 12px rgba(30,196,106, 0.40)",
  goldLg:  "0 0 48px rgba(30,196,106, 0.60), 0 0 16px rgba(30,196,106, 0.75)",
  ruby:    "0 0 24px rgba(30,196,106, 0.55), 0 0 8px rgba(30,196,106, 0.65)",
  rubySm:  "0 0 12px rgba(30,196,106, 0.40)",
  rubyLg:  "0 0 48px rgba(30,196,106, 0.65), 0 0 16px rgba(30,196,106, 0.80)",
  amber:   "0 0 24px rgba(255,200,61, 0.55)",
  emerald: "0 0 24px rgba(30,196,106, 0.45)",
  none:    "none",
} as const;

export const c7BlackRedShadow = {
  card:      "0 4px 24px rgba(0, 0, 0, 0.70), 0 1px 0 rgba(255, 255, 255, 0.05) inset",
  cardHover: "0 8px 32px rgba(0, 0, 0, 0.85), 0 1px 0 rgba(255, 255, 255, 0.10) inset",
  modal:     "0 24px 64px rgba(0, 0, 0, 0.92), 0 0 1px rgba(255, 255, 255, 0.12) inset",
  raised:    "0 2px 12px rgba(0, 0, 0, 0.65)",
  inner:     "inset 0 1px 0 rgba(255, 255, 255, 0.06), inset 0 -1px 0 rgba(0, 0, 0, 0.70)",
} as const;

// ────────────────────────────────────────────────────────────────────────────
// TYPOGRAPHY / SPACING / RADII / MOTION / LAYERS / BREAKPOINTS — unchanged
// ────────────────────────────────────────────────────────────────────────────

export const c7BlackRedType = {
  family: {
    display: '"Orbitron", "Space Grotesk", system-ui, sans-serif',
    body: '"Inter", system-ui, -apple-system, sans-serif',
    mono: '"JetBrains Mono", ui-monospace, monospace',
  },
  size: {
    xs:"11px",sm:"12px",base:"14px",md:"15px",lg:"17px",xl:"20px",
    "2xl":"24px","3xl":"32px","4xl":"40px",hero:"56px",
  },
  weight: { regular:400, medium:500, semibold:600, bold:700, black:900 },
  tracking: { tight:"-0.02em", normal:"0", wide:"0.02em", wider:"0.06em", widest:"0.12em" },
} as const;

export const c7BlackRedSpace = {
  0:"0", 1:"4px", 2:"8px", 3:"12px", 4:"16px", 5:"20px", 6:"24px",
  8:"32px", 10:"40px", 12:"48px", 16:"64px", 20:"80px", 24:"96px",
} as const;

export const c7BlackRedRadius = {
  none:"0", sm:"6px", md:"10px", lg:"14px", xl:"20px",
  "2xl":"28px", pill:"999px", card:"20px", modal:"24px",
} as const;

export const c7BlackRedMotion = {
  duration: { instant:0.08, fast:0.18, base:0.28, slow:0.42, slowest:0.7 },
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
        "0 0 8px rgba(30,196,106, 0.4)",
        "0 0 24px rgba(30,196,106, 0.75)",
        "0 0 8px rgba(30,196,106, 0.4)",
      ],
    },
    transition: { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const },
  },
  glowPulseRuby: {
    animate: {
      boxShadow: [
        "0 0 8px rgba(30,196,106, 0.4)",
        "0 0 24px rgba(30,196,106, 0.75)",
        "0 0 8px rgba(30,196,106, 0.4)",
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

export const c7BlackRedLayer = {
  base:0, raised:1, sticky:10, dropdown:20, navigation:30,
  modal:40, toast:50, popover:60, tooltip:70, splash:100,
} as const;

export const c7BlackRedBreakpoint = {
  sm:"430px", md:"768px", lg:"1024px", xl:"1280px",
} as const;

export const c7BlackRedVipTier = {
  bronze:   { accent: "#7a3a00", glow: c7BlackRedGlow.amber, label: "Bronze" },
  silver:   { accent: "#c8c8c8", glow: "0 0 24px rgba(200, 200, 200, 0.5)", label: "Silver" },
  gold:     { accent: c7BlackRedColors.amber[500], glow: c7BlackRedGlow.amber, label: "Gold" },
  platinum: { accent: "#e5e5e5", glow: "0 0 24px rgba(229, 229, 229, 0.55)", label: "Platinum" },
  diamond:  { accent: c7BlackRedColors.ruby[500], glow: c7BlackRedGlow.ruby, label: "Diamond" },
} as const;

export const c7BlackRedSound = {
  intro:        "/sounds/intro-theme.mp3",
  buttonClick:  "/sounds/click.mp3",
  jackpot:      "/sounds/jackpot.mp3",
  winCelebrate: "/sounds/win.mp3",
  notification: "/sounds/notification.mp3",
  spinStart:    "/sounds/spin-start.mp3",
  spinEnd:      "/sounds/spin-end.mp3",
  coin:         "/sounds/coin.mp3",
} as const;

export const c7BlackRedTheme = {
  name: "C7Winner — Black/Red Dark (BC.Game style)",
  version: "5.0.0",
  colors: c7BlackRedColors,
  gradients: c7BlackRedGradients,
  glow: c7BlackRedGlow,
  shadow: c7BlackRedShadow,
  type: c7BlackRedType,
  space: c7BlackRedSpace,
  radius: c7BlackRedRadius,
  motion: c7BlackRedMotion,
  layer: c7BlackRedLayer,
  breakpoint: c7BlackRedBreakpoint,
  vipTier: c7BlackRedVipTier,
  sound: c7BlackRedSound,
} as const;

export type C7BlackRedTheme = typeof c7BlackRedTheme;
export default c7BlackRedTheme;
