import { useEffect, useRef, ReactNode } from 'react';
import { c7Theme as t } from '@/theme/c7-sun27-compat';
import { useSound } from '@/hooks/useSound';
import './c7-animations.css';

export interface AnimatedModalProps {
  open: boolean;
  /** Called when backdrop is clicked or ESC pressed (set undefined to disable both) */
  onClose?: () => void;
  /** Optional title rendered in the header */
  title?: string;
  /** Optional subtitle below title */
  subtitle?: string;
  /** Disable backdrop click to close */
  disableBackdropClick?: boolean;
  /** Disable ESC key to close */
  disableEscClose?: boolean;
  /** Show ✕ close button in header */
  showCloseButton?: boolean;
  /** Max width in px */
  maxWidth?: number;
  /** Color theme — drives header gradient */
  variant?: 'aqua' | 'gold' | 'ruby' | 'emerald' | 'plain';
  /** Render children directly without the default header treatment */
  bare?: boolean;
  /** Children content */
  children: ReactNode;
}

const VARIANT_GRADIENT = {
  aqua:    'hero',     // teal→aqua
  gold:    'jackpot',
  ruby:    null,       // custom below
  emerald: null,
  plain:   null,
} as const;

export function AnimatedModal({
  open,
  onClose,
  title,
  subtitle,
  disableBackdropClick = false,
  disableEscClose = false,
  showCloseButton = true,
  maxWidth = 360,
  variant = 'aqua',
  bare = false,
  children,
}: AnimatedModalProps) {
  const { play } = useSound();
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC to close
  useEffect(() => {
    if (!open || disableEscClose) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        play('buttonClick');
        onClose?.();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, disableEscClose, onClose, play]);

  // Focus management — save + restore + initial focus
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement | null;
      // Focus first focusable element in modal
      requestAnimationFrame(() => {
        const focusables = modalRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        focusables?.[0]?.focus();
      });
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open]);

  // Body scroll lock while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const onBackdrop = () => {
    if (disableBackdropClick) return;
    play('buttonClick');
    onClose?.();
  };

  // Pick header gradient
  let headerBg: string | null = null;
  if (!bare && title) {
    if (variant === 'aqua') headerBg = t.gradients.hero;
    else if (variant === 'gold') headerBg = t.gradients.jackpot;
    else if (variant === 'ruby') headerBg = `linear-gradient(135deg, ${t.colors.ruby[500]}, #b91c1c)`;
    else if (variant === 'emerald') headerBg = `linear-gradient(135deg, ${t.colors.emerald[500]}, #047857)`;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'c7-modal-title' : undefined}
      onClick={onBackdrop}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(4, 6, 10, 0.88)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: t.layer.modal,
        padding: 20,
        animation: 'c7-fade-up 0.24s cubic-bezier(0.16,1,0.3,1) both',
      }}
    >
      <div
        ref={modalRef}
        className="c7-modal"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth,
          maxHeight: 'calc(100vh - 40px)',
          overflowY: 'auto',
          borderRadius: 16,
          background: bare ? 'transparent' : t.colors.surface.deep,
          border: bare ? 'none' : `1px solid ${t.colors.border.aqua}`,
          boxShadow: bare ? 'none' : `${t.glow.aqua}, 0 24px 60px rgba(0,0,0,0.6)`,
          position: 'relative',
        }}
      >
        {/* Header */}
        {!bare && title && headerBg && (
          <div
            style={{
              background: headerBg,
              padding: '18px 20px 14px',
              textAlign: 'center',
              borderRadius: '16px 16px 0 0',
              position: 'relative',
            }}
          >
            <h2
              id="c7-modal-title"
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 900,
                color: t.colors.text.onAccent,
                letterSpacing: t.type.tracking.widest,
                fontFamily: t.type.family.display,
                textShadow: '0 1px 2px rgba(0,0,0,0.15)',
              }}
            >
              {title}
            </h2>
            {subtitle && (
              <div
                style={{
                  fontSize: 11,
                  color: t.colors.text.onAccent,
                  opacity: 0.85,
                  marginTop: 4,
                  letterSpacing: t.type.tracking.wider,
                  fontWeight: 700,
                }}
              >
                {subtitle}
              </div>
            )}
            {showCloseButton && onClose && (
              <button
                className="c7-btn"
                onClick={() => { play('buttonClick'); onClose(); }}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: 10,
                  right: 12,
                  background: 'rgba(4,6,10,0.35)',
                  border: 'none',
                  borderRadius: '50%',
                  width: 28,
                  height: 28,
                  fontSize: 14,
                  color: t.colors.text.onAccent,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >✕</button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: bare || !title ? 0 : '20px' }}>
          {/* If there's no title but close button is wanted, render a floating close */}
          {!bare && !title && showCloseButton && onClose && (
            <button
              className="c7-btn"
              onClick={() => { play('buttonClick'); onClose(); }}
              aria-label="Close"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: t.colors.surface.elevated,
                border: `1px solid ${t.colors.border.soft}`,
                borderRadius: '50%',
                width: 30,
                height: 30,
                fontSize: 14,
                color: t.colors.text.primary,
                cursor: 'pointer',
                zIndex: 1,
              }}
            >✕</button>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export default AnimatedModal;
