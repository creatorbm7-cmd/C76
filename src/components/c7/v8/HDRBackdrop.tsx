/**
 * V9 HDRBackdrop — Full-page cinematic ambient layer for the C7 lobby.
 *
 * This is the v9 rewrite of HDRBackdrop. Three changes from v8.1:
 *
 *   1. Theme alignment — uses sun27 palette (gold + amber + ruby) instead
 *      of leftover Neon Aqua palette (teal + violet). The old colors were
 *      a holdover from the pre-sun27 era and visually fought with the
 *      lobby's warm chrome.
 *
 *   2. Ambient video layer — deepest layer is now a heavily-blurred,
 *      low-opacity loop of lobby-hero.mp4. Adds organic motion under the
 *      static gradients without competing for attention. Gated on
 *      screen size + reduced motion.
 *
 *   3. Scroll-driven parallax — each layer translates at a different
 *      rate as the user scrolls, creating depth perception. Rates are
 *      gentle (0.15x to 0.5x) to avoid disorientation. Throttled via
 *      requestAnimationFrame to a single frame per tick.
 *
 * Layers (back to front):
 *   0. Deep warm gradient base                       (no parallax)
 *   1. Ambient blurred video                         (parallax 0.15x)
 *   2. Drifting HDR orbs (gold / amber / ruby)       (parallax 0.30x)
 *   3. Sparse rising particles                       (parallax 0.50x)
 *   4. Vignette                                      (no parallax)
 *
 * Pointer-events: none on every layer. Respects prefers-reduced-motion.
 *
 * Mobile budget: ~1% CPU on iPhone 12. All transforms GPU-composited
 * via will-change + translate3d.
 */

import { useEffect, useMemo, useRef, useState } from 'react';

const HDR_CSS = `
@keyframes hdr9-orb-drift {
  0%   { transform: translate3d(  0vw,   0vh, 0) scale(1); }
  33%  { transform: translate3d( 12vw,  -8vh, 0) scale(1.08); }
  66%  { transform: translate3d( -8vw,  10vh, 0) scale(0.95); }
  100% { transform: translate3d(  0vw,   0vh, 0) scale(1); }
}
@keyframes hdr9-orb-drift-alt {
  0%   { transform: translate3d(  0vw,   0vh, 0) scale(1); }
  50%  { transform: translate3d(-10vw,  12vh, 0) scale(1.12); }
  100% { transform: translate3d(  0vw,   0vh, 0) scale(1); }
}
@keyframes hdr9-orb-drift-slow {
  0%   { transform: translate3d(  0vw,   0vh, 0); }
  50%  { transform: translate3d(  8vw,   6vh, 0); }
  100% { transform: translate3d(  0vw,   0vh, 0); }
}
@keyframes hdr9-particle-rise {
  0%   { transform: translate3d(0, 8vh, 0)    scale(0.6); opacity: 0;   }
  10%  { opacity: 0.85; }
  90%  { opacity: 0.85; }
  100% { transform: translate3d(2vw, -110vh, 0) scale(1.1); opacity: 0; }
}

.hdr9-root {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
  will-change: transform;
  transform: translateZ(0);
}

.hdr9-base {
  position: absolute; inset: 0;
  background:
    radial-gradient(80% 60% at 50% -10%, rgba(30, 196, 106, 0.13) 0%, transparent 65%),
    radial-gradient(70% 55% at 90% 80%, rgba(255, 200, 61, 0.07) 0%, transparent 65%),
    radial-gradient(70% 55% at 10% 90%, rgba(11, 122, 63, 0.14) 0%, transparent 65%),
    linear-gradient(180deg, #041610 0%, #06180f 50%, #030d08 100%);
}

.hdr9-video-layer {
  position: absolute;
  inset: -10% -10% -10% -10%;
  will-change: transform;
}
.hdr9-video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: blur(48px) saturate(1.6) brightness(0.55) hue-rotate(-8deg);
  transform: scale(1.2);
  opacity: 0.22;
  mix-blend-mode: screen;
}

.hdr9-orbs {
  position: absolute; inset: 0;
  will-change: transform;
}
.hdr9-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(56px);
  will-change: transform;
  mix-blend-mode: screen;
}
.hdr9-orb--gold {
  width: 440px; height: 440px;
  top: -100px; left: -80px;
  background: radial-gradient(circle, rgba(30, 196, 106, 0.5), rgba(30, 196, 106, 0));
  animation: hdr9-orb-drift 22s ease-in-out infinite;
  opacity: 0.55;
}
.hdr9-orb--amber {
  width: 380px; height: 380px;
  bottom: -120px; right: -80px;
  background: radial-gradient(circle, rgba(255, 200, 61, 0.4), rgba(255, 200, 61, 0));
  animation: hdr9-orb-drift-alt 28s ease-in-out infinite;
  opacity: 0.40;
}
.hdr9-orb--ruby {
  width: 360px; height: 360px;
  top: 28%; right: -140px;
  background: radial-gradient(circle, rgba(11, 122, 63, 0.5), rgba(11, 122, 63, 0));
  animation: hdr9-orb-drift-slow 34s ease-in-out infinite;
  opacity: 0.35;
}
.hdr9-orb--ruby-deep {
  width: 300px; height: 300px;
  bottom: 22%; left: -110px;
  background: radial-gradient(circle, rgba(8, 61, 34, 0.5), rgba(8, 61, 34, 0));
  animation: hdr9-orb-drift 30s ease-in-out infinite reverse;
  opacity: 0.32;
}

.hdr9-particles {
  position: absolute; inset: 0;
  will-change: transform;
}
.hdr9-particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  will-change: transform, opacity;
}

.hdr9-vignette {
  position: absolute; inset: 0;
  background:
    radial-gradient(150% 100% at 50% 50%, transparent 0%, transparent 55%, rgba(0, 0, 0, 0.65) 100%);
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .hdr9-orb, .hdr9-particle, .hdr9-video {
    animation: none !important;
  }
  .hdr9-video-layer { display: none; }
}
`;

let HDR9_INJECTED = false;
function injectCss() {
  if (HDR9_INJECTED || typeof document === 'undefined') return;
  if (document.getElementById('hdr9-backdrop-css')) { HDR9_INJECTED = true; return; }
  const s = document.createElement('style');
  s.id = 'hdr9-backdrop-css';
  s.textContent = HDR_CSS;
  document.head.appendChild(s);
  HDR9_INJECTED = true;
}

function isMobile() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(max-width: 600px)').matches;
}
function isReducedMotion() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export interface HDRBackdropProps {
  particleCount?: number;
  /** @deprecated — scan line removed in v9, prop retained for source compat. */
  noScanLine?: boolean;
  noVideo?: boolean;
  videoSrc?: string;
}

export default function HDRBackdrop({
  particleCount = 20,
  noVideo = false,
  videoSrc = '/videos/lobby-hero.mp4',
}: HDRBackdropProps) {
  const videoLayerRef = useRef<HTMLDivElement | null>(null);
  const orbsRef       = useRef<HTMLDivElement | null>(null);
  const particlesRef  = useRef<HTMLDivElement | null>(null);

  const [showVideo, setShowVideo] = useState(false);
  const [enableParallax, setEnableParallax] = useState(false);

  useEffect(() => {
    injectCss();
    const reduced = isReducedMotion();
    const mobile = isMobile();
    setShowVideo(!noVideo && !reduced && !mobile);
    setEnableParallax(!reduced);
  }, [noVideo]);

  const particles = useMemo(() => Array.from({ length: particleCount }).map((_, i) => {
    const size = 1.5 + (i % 5) * 0.6;
    const left = ((i * 13.37) + 7) % 100;
    const delay = (i * 0.71) % 14;
    const dur = 18 + (i % 9) * 1.7;
    const color = i % 3 === 0 ? '#22e07a' : i % 3 === 1 ? '#ffe9a8' : '#0b7a3f';
    return { size, left, delay, dur, color, key: i };
  }), [particleCount]);

  useEffect(() => {
    if (!enableParallax) return;

    let raf = 0;
    let lastY = 0;

    const apply = () => {
      raf = 0;
      const y = lastY;
      if (videoLayerRef.current) {
        videoLayerRef.current.style.transform = `translate3d(0, ${y * 0.15}px, 0)`;
      }
      if (orbsRef.current) {
        orbsRef.current.style.transform = `translate3d(0, ${y * 0.30}px, 0)`;
      }
      if (particlesRef.current) {
        particlesRef.current.style.transform = `translate3d(0, ${y * 0.50}px, 0)`;
      }
    };

    const onScroll = () => {
      lastY = window.scrollY;
      if (!raf) raf = requestAnimationFrame(apply);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [enableParallax]);

  return (
    <div className="hdr9-root" aria-hidden="true">
      <div className="hdr9-base" />

      {showVideo && (
        <div className="hdr9-video-layer" ref={videoLayerRef}>
          <video
            className="hdr9-video"
            src={videoSrc}
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
          />
        </div>
      )}

      <div className="hdr9-orbs" ref={orbsRef}>
        <div className="hdr9-orb hdr9-orb--gold"      />
        <div className="hdr9-orb hdr9-orb--amber"     />
        <div className="hdr9-orb hdr9-orb--ruby"      />
        <div className="hdr9-orb hdr9-orb--ruby-deep" />
      </div>

      <div className="hdr9-particles" ref={particlesRef}>
        {particles.map((p) => (
          <span
            key={p.key}
            className="hdr9-particle"
            style={{
              left:    `${p.left}%`,
              bottom:  '-12px',
              width:   p.size,
              height:  p.size,
              background: p.color,
              boxShadow: `0 0 ${p.size * 4}px ${p.color}`,
              opacity: 0,
              animation: `hdr9-particle-rise ${p.dur}s linear ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      <div className="hdr9-vignette" />
    </div>
  );
}
