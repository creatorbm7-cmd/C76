/**
 * c7Sys — shared design-system primitives for all C7 pages.
 *
 * Goal: ONE visual language across /casino, /wallet, /profile, /top, /login, /vip.
 *
 * Exports:
 *   - <PageContainer>       Full-height void background, bottom-nav-safe padding
 *   - <PageHeader>          Standard title + subtitle + right-slot (e.g. LIVE pill)
 *   - <LivePill>            Realtime status pill — consistent across all pages
 *   - <Card>                Glass-morphism surface, standard padding/border/shadow
 *   - <CardElevated>        Same as Card but for prominent featured content
 *   - <Btn>                 primary / secondary / ghost variants
 *   - <Stat>                KPI tile (label above, value below)
 *   - <SectionLabel>        Small uppercase tracked label for sectioning
 *   - injectC7SystemCSS()   One-time global animation install
 *
 * Pages should call injectC7SystemCSS() once on mount, then compose with these
 * primitives. Logic, data fetching, and page-specific visuals stay in each page.
 */

import React, { useEffect } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL ANIMATIONS — installed once, used everywhere
// ─────────────────────────────────────────────────────────────────────────────

const C7_SYSTEM_CSS = `
@keyframes c7sys-pulse-dot { 0%,100%{ opacity: 1; transform: scale(1) } 50%{ opacity: 0.4; transform: scale(0.8) } }
@keyframes c7sys-rise { 0% { opacity: 0; transform: translateY(8px) } 100% { opacity: 1; transform: translateY(0) } }
@keyframes c7sys-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes c7sys-spin { to { transform: rotate(360deg) } }

.c7-fade-in { animation: c7sys-rise 420ms cubic-bezier(.21,1.02,.73,1) both; }
.c7-pulse-dot { animation: c7sys-pulse-dot 1.6s ease-in-out infinite; }
.c7-tap { transition: transform 160ms cubic-bezier(.34,1.56,.64,1), filter 160ms, box-shadow 200ms; }
.c7-tap:active { transform: scale(0.97); filter: brightness(1.12); }
.c7-card-hover { transition: transform 220ms, box-shadow 220ms, border-color 220ms; }
.c7-card-hover:hover { transform: translateY(-2px); }

/* Consistent focus ring for all inputs */
.c7-input { transition: border-color 180ms, box-shadow 180ms; }
.c7-input:focus {
  border-color: rgba(255, 201, 53, 0.5) !important;
  box-shadow: 0 0 0 3px rgba(255, 201, 53, 0.12);
  outline: none;
}

/* Title gradient (shared between H1s) */
.c7-title-gradient {
  background: linear-gradient(135deg, #ffc935 0%, #ffc940 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
`;

let _c7CssInstalled = false;
export function injectC7SystemCSS() {
  if (_c7CssInstalled) return;
  if (typeof document === 'undefined') return;
  if (document.getElementById('c7-system-css')) {
    _c7CssInstalled = true;
    return;
  }
  const tag = document.createElement('style');
  tag.id = 'c7-system-css';
  tag.textContent = C7_SYSTEM_CSS;
  document.head.appendChild(tag);
  _c7CssInstalled = true;
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED STYLE TOKENS — visual constants reused by every primitive
// ─────────────────────────────────────────────────────────────────────────────

export const c7Sys = {
  // Page-level
  pagePad: '20px 16px calc(128px + env(safe-area-inset-bottom, 0px))', // clears the 116px bottom nav
  pageBg: t.colors.surface.void,

  // Card surfaces (UNIFIED — was previously 14/16/18/20px blur, now standardized)
  cardBlur: 'blur(14px)',
  cardElevatedBlur: 'blur(18px)',
  cardPad: 20,
  cardPadCompact: 16,
  cardRadius: t.radius.card,
  cardBorder: `1px solid ${t.colors.border.medium}`,
  cardBg: t.colors.surface.glass,
  cardShadow: t.shadow.card,
  cardShadowElevated: t.shadow.modal,

  // Buttons
  btnHeight: 48,
  btnHeightSm: 38,
  btnRadius: t.radius.md,
  btnPillRadius: t.radius.pill,
  btnFontSize: 13,
  btnFontWeight: 900 as const,
  btnLetterSpacing: 1.4,

  // Section labels (small uppercase tracked text)
  labelFontSize: 10,
  labelFontWeight: 900 as const,
  labelLetterSpacing: 1.8,
  labelColor: t.colors.text.tertiary,
};

// ─────────────────────────────────────────────────────────────────────────────
// PageContainer — root <div> for every page
// ─────────────────────────────────────────────────────────────────────────────

export const PageContainer: React.FC<{ children: React.ReactNode; ambient?: boolean }> = ({ children, ambient = true }) => {
  useEffect(() => { injectC7SystemCSS(); }, []);
  return (
    <div style={{
      minHeight: '100vh',
      background: c7Sys.pageBg,
      color: t.colors.text.primary,
      padding: c7Sys.pagePad,
      fontFamily: 'inherit',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {ambient && (
        <div style={{
          position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
          background: `
            radial-gradient(70% 40% at 50% 0%, rgba(255, 201, 64, 0.06) 0%, transparent 60%),
            radial-gradient(70% 50% at 50% 100%, rgba(255, 201, 53, 0.06) 0%, transparent 60%)
          `,
        }} />
      )}
      <div style={{ position: 'relative', zIndex: 1, maxWidth: 720, margin: '0 auto' }}>
        {children}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LivePill — unified realtime indicator
// ─────────────────────────────────────────────────────────────────────────────

export const LivePill: React.FC<{ isLive: boolean; label?: string }> = ({ isLive, label }) => (
  <span style={{
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '4px 9px',
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 1.3,
    borderRadius: t.radius.pill,
    background: isLive ? `${t.colors.emerald[500]}1f` : `${t.colors.text.tertiary}1a`,
    color: isLive ? t.colors.emerald[500] : t.colors.text.tertiary,
    border: `1px solid ${isLive ? t.colors.emerald[500] + '55' : t.colors.border.subtle}`,
    textTransform: 'uppercase',
    whiteSpace: 'nowrap',
  }}>
    <span className={isLive ? 'c7-pulse-dot' : ''} style={{ fontSize: 8, lineHeight: 1 }}>●</span>
    {label || (isLive ? 'Live' : 'Offline')}
  </span>
);

// ─────────────────────────────────────────────────────────────────────────────
// PageHeader — title + subtitle + optional LIVE pill or right slot
// ─────────────────────────────────────────────────────────────────────────────

export const PageHeader: React.FC<{
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
}> = ({ title, subtitle, rightSlot }) => (
  <div style={{
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 20,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <h1 style={{
        margin: 0,
        fontSize: 26,
        fontWeight: 900,
        letterSpacing: t.type.tracking.tight,
        lineHeight: 1.05,
      }}>
        <span className="c7-title-gradient">{title}</span>
      </h1>
      {subtitle && (
        <div style={{
          marginTop: 4,
          fontSize: c7Sys.labelFontSize,
          fontWeight: c7Sys.labelFontWeight,
          letterSpacing: 2,
          color: c7Sys.labelColor,
          textTransform: 'uppercase',
        }}>{subtitle}</div>
      )}
    </div>
    {rightSlot && (
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
        {rightSlot}
      </div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel — small uppercase header above grouped content
// ─────────────────────────────────────────────────────────────────────────────

export const SectionLabel: React.FC<{ children: React.ReactNode; right?: React.ReactNode }> = ({ children, right }) => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 4,
  }}>
    <div style={{
      fontSize: c7Sys.labelFontSize,
      fontWeight: c7Sys.labelFontWeight,
      letterSpacing: c7Sys.labelLetterSpacing,
      color: c7Sys.labelColor,
      textTransform: 'uppercase',
    }}>{children}</div>
    {right && <div>{right}</div>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Card — standard glass surface
// ─────────────────────────────────────────────────────────────────────────────

type CardProps = {
  children: React.ReactNode;
  elevated?: boolean;
  compact?: boolean;
  style?: React.CSSProperties;
  accentBorder?: string; // override for tier-color accents (Profile/VIP)
  noPadding?: boolean;
  className?: string;
  onClick?: () => void;
};

export const Card: React.FC<CardProps> = ({ children, elevated, compact, style, accentBorder, noPadding, className, onClick }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      padding: noPadding ? 0 : compact ? c7Sys.cardPadCompact : c7Sys.cardPad,
      background: c7Sys.cardBg,
      backdropFilter: elevated ? c7Sys.cardElevatedBlur : c7Sys.cardBlur,
      WebkitBackdropFilter: elevated ? c7Sys.cardElevatedBlur : c7Sys.cardBlur,
      border: accentBorder ? `1px solid ${accentBorder}` : c7Sys.cardBorder,
      borderRadius: c7Sys.cardRadius,
      boxShadow: elevated ? c7Sys.cardShadowElevated : c7Sys.cardShadow,
      cursor: onClick ? 'pointer' : 'default',
      ...style,
    }}
  >
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Btn — single button system: primary / secondary / ghost / danger
// ─────────────────────────────────────────────────────────────────────────────

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type BtnProps = {
  children: React.ReactNode;
  variant?: BtnVariant;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
  pill?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
};

export const Btn: React.FC<BtnProps> = ({
  children, variant = 'primary', size = 'md', fullWidth, loading, disabled,
  pill = false, onClick, type = 'button', style,
}) => {
  const isDisabled = disabled || loading;
  const height = size === 'lg' ? 52 : size === 'sm' ? 36 : c7Sys.btnHeight;
  const fontSize = size === 'lg' ? 14 : size === 'sm' ? 11 : c7Sys.btnFontSize;
  const padX = size === 'lg' ? 22 : size === 'sm' ? 14 : 18;

  const variants: Record<BtnVariant, React.CSSProperties> = {
    primary: {
      background: isDisabled ? 'rgba(255,255,255,0.08)' : t.gradients.goldBar,
      color: isDisabled ? t.colors.text.tertiary : '#04060a',
      border: 'none',
      boxShadow: isDisabled ? 'none' : '0 4px 16px rgba(255, 201, 64, 0.22)',
    },
    secondary: {
      background: 'rgba(255, 201, 53, 0.08)',
      color: t.colors.aqua[500],
      border: `1px solid ${t.colors.aqua[500]}55`,
    },
    ghost: {
      background: 'transparent',
      color: t.colors.text.secondary,
      border: `1px solid ${t.colors.border.medium}`,
    },
    danger: {
      background: `${t.colors.ruby[500]}18`,
      color: t.colors.ruby[500],
      border: `1px solid ${t.colors.ruby[500]}55`,
    },
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className="c7-tap"
      style={{
        height,
        padding: `0 ${padX}px`,
        fontSize,
        fontWeight: c7Sys.btnFontWeight,
        letterSpacing: c7Sys.btnLetterSpacing,
        textTransform: 'uppercase',
        borderRadius: pill ? c7Sys.btnPillRadius : c7Sys.btnRadius,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        width: fullWidth ? '100%' : undefined,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        fontFamily: 'inherit',
        ...variants[variant],
        ...(style || {}),
      }}
    >
      {loading ? '…' : children}
    </button>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Stat — KPI tile (label + value + optional sub)
// ─────────────────────────────────────────────────────────────────────────────

export const Stat: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: string;
  align?: 'left' | 'center';
}> = ({ label, value, sub, accent, align = 'left' }) => (
  <div style={{ textAlign: align }}>
    <div style={{
      fontSize: c7Sys.labelFontSize,
      fontWeight: c7Sys.labelFontWeight,
      letterSpacing: c7Sys.labelLetterSpacing,
      color: c7Sys.labelColor,
      textTransform: 'uppercase',
      marginBottom: 4,
    }}>{label}</div>
    <div style={{
      fontSize: 20,
      fontWeight: 900,
      letterSpacing: t.type.tracking.tight,
      lineHeight: 1.1,
      color: accent || t.colors.text.primary,
    }}>{value}</div>
    {sub && (
      <div style={{
        fontSize: 11,
        fontWeight: 600,
        color: t.colors.text.tertiary,
        marginTop: 2,
      }}>{sub}</div>
    )}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// Spacer — vertical spacing helper
// ─────────────────────────────────────────────────────────────────────────────

export const Spacer: React.FC<{ size?: number }> = ({ size = 16 }) => <div style={{ height: size }} />;
