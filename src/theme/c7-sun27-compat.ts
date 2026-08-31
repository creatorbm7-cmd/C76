/**
 * C7Winner — Theme Compat Shim
 * UONO BUILDER · Black/Red "UNO Live" v6 (pure black + brand red + prize gold)
 */

import {
  c7BlackRedColors     as activeColors,
  c7BlackRedGradients  as activeGradients,
  c7BlackRedGlow       as activeGlow,
  c7BlackRedShadow     as activeShadow,
  c7BlackRedType       as activeType,
  c7BlackRedSpace      as activeSpace,
  c7BlackRedRadius     as activeRadius,
  c7BlackRedMotion     as activeMotion,
  c7BlackRedLayer      as activeLayer,
  c7BlackRedBreakpoint as activeBreakpoint,
  c7BlackRedVipTier    as activeVipTier,
  c7BlackRedSound      as activeSound,
} from "./c7-blackred-dark";

const aquaCompat = {
  50:  "#e8f5ee", 100: "#c8ebd9", 200: "#9adcbc",
  300: activeColors.ruby[300],
  400: activeColors.ruby[400],
  500: activeColors.ruby[500],
  600: activeColors.ruby[600],
  700: activeColors.ruby[700],
  800: "#062818", 900: "#031a0e",
  glow: activeColors.ruby.glow,
  glowSoft: activeColors.ruby.glowSoft,
} as const;

const compatColors = {
  ...activeColors,
  aqua: aquaCompat,
  border: { ...activeColors.border, aqua: activeColors.border.ruby },
} as const;
const compatGradients = { ...activeGradients, aquaBar: activeGradients.rubyBar } as const;
const compatGlow = { ...activeGlow, aqua: activeGlow.ruby, aquaSm: activeGlow.rubySm } as const;

export const c7Theme = {
  name: "UONO BUILDER",
  version: "6.0.0-compat",
  colors: compatColors,
  gradients: compatGradients,
  glow: compatGlow,
  shadow: activeShadow,
  type: activeType,
  space: activeSpace,
  radius: activeRadius,
  motion: activeMotion,
  layer: activeLayer,
  breakpoint: activeBreakpoint,
  vipTier: activeVipTier,
  sound: activeSound,
} as const;

export type C7Theme = typeof c7Theme;
