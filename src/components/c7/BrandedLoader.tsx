import { CSSProperties } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';

/* ──────────────────────────────────────────────────────────────── */
/* Spinner — branded ring with gold accent + aqua trail            */
/* ──────────────────────────────────────────────────────────────── */
interface SpinnerProps {
  size?: number;
  /** Override the leading edge color. Defaults to gold. */
  accent?: string;
  /** Override the trailing ring color. Defaults to faint aqua. */
  trail?: string;
  style?: CSSProperties;
}

export function BrandedSpinner({ size = 40, accent, trail, style }: SpinnerProps) {
  return (
    <div
      role="status"
      aria-label="Loading"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        border: `2px solid ${trail || 'rgba(255, 201, 53, 0.18)'}`,
        borderTopColor: accent || t.colors.gold[500],
        animation: 'c7-spin 0.8s linear infinite',
        ...style,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* Skeleton — shimmer placeholder for content-shaped regions      */
/* ──────────────────────────────────────────────────────────────── */
interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  rounded?: number;
  /** Color theme. 'aqua' (default) or 'gold' for premium areas. */
  variant?: 'aqua' | 'gold';
  style?: CSSProperties;
}

export function BrandedSkeleton({
  width = '100%',
  height = 16,
  rounded = 8,
  variant = 'aqua',
  style,
}: SkeletonProps) {
  const gradient =
    variant === 'gold'
      ? 'linear-gradient(90deg, rgba(255,201,64,0.05) 0%, rgba(255,201,64,0.22) 50%, rgba(255,201,64,0.05) 100%)'
      : 'linear-gradient(90deg, rgba(255, 201, 53,0.04) 0%, rgba(255, 201, 53,0.16) 50%, rgba(255, 201, 53,0.04) 100%)';
  return (
    <div
      aria-hidden
      style={{
        width,
        height,
        borderRadius: rounded,
        background: gradient,
        backgroundSize: '200% 100%',
        animation: 'c7-shimmer 1.8s linear infinite',
        ...style,
      }}
    />
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* PageLoader — full-screen branded loading state                  */
/* Use as Suspense fallback or initial auth check screen           */
/* ──────────────────────────────────────────────────────────────── */
interface PageLoaderProps {
  message?: string;
}

export function BrandedPageLoader({ message = 'Loading' }: PageLoaderProps) {
  return (
    <div
      role="status"
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        background: '#04060a',
        zIndex: 200,
      }}
    >
      <BrandedSpinner size={56} />
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 4,
          color: 'rgba(255,255,255,0.55)',
          textTransform: 'uppercase',
        }}
      >
        {message}
      </div>
    </div>
  );
}

export default BrandedSpinner;
