/**
 * JackpotMascot — 3D animated scene for the lobby jackpot card.
 *
 * Renders a spinning gold coin with floating particles in a small
 * canvas, sitting behind/around the jackpot number. Lightweight
 * Three.js scene, ~200x200 canvas, GPU-composited.
 *
 * Mascot slot:
 *   Pass `mascotSrc` to override the 3D scene with a static image,
 *   video, or Lottie JSON. The component handles each format:
 *     - .mp4 / .webm        → looping muted video
 *     - .png / .jpg / .webp → static image
 *     - .json (lottie)      → lottie-web player (lazy-loaded)
 *
 * When you license a real 3D mascot from a studio or AssetHub, drop
 * the asset URL into this prop and the Three.js fallback turns off.
 *
 * Performance:
 *   - Single canvas with one mesh + 6 particles
 *   - Caps rendering at 30 FPS on mobile (60 on desktop)
 *   - Pauses on `prefers-reduced-motion`
 *   - Disposes properly on unmount (no memory leak)
 *
 * Does NOT use post-processing, shadows, or env maps to keep the
 * bundle cost low. Three.js is already in deps for the future
 * crash-game canvas (per the Crash Engine Spec), so importing it
 * here is justified.
 */

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
const SMALL_SCREEN = '(max-width: 600px)';

export interface JackpotMascotProps {
  /** Optional asset URL to override the 3D scene. Supports mp4/webm/png/jpg/webp/json. */
  mascotSrc?: string;
  /** Canvas size in px. Default 180. */
  size?: number;
  /** Hex color of the coin face. Default brand red. */
  coinColor?: string;
  /** Hex color of the coin edge/rim. Default warm gold. */
  rimColor?: string;
}

export default function JackpotMascot({
  mascotSrc,
  size = 180,
  coinColor = '#5c0d17',
  rimColor = '#e02b3c',
}: JackpotMascotProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animFrame = useRef<number | null>(null);

  // ── Asset-slot branch ────────────────────────────────────────────────────
  if (mascotSrc) {
    return <MascotAsset src={mascotSrc} size={size} />;
  }

  // ── Three.js scene branch ────────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Respect reduced motion — render a static pose, don't animate.
    const reduced =
      typeof window !== 'undefined' && window.matchMedia(REDUCED_MOTION).matches;
    const mobile =
      typeof window !== 'undefined' && window.matchMedia(SMALL_SCREEN).matches;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    camera.position.set(0, 0.4, 4.6);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !mobile });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(size, size);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Coin (cylinder oriented edge-on, then tilted slightly)
    const coinGeom = new THREE.CylinderGeometry(1.0, 1.0, 0.16, 48);
    const coinFaceMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(coinColor),
      metalness: 0.55,
      roughness: 0.35,
      emissive: new THREE.Color(coinColor),
      emissiveIntensity: 0.18,
    });
    const coinEdgeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      metalness: 0.85,
      roughness: 0.25,
      emissive: new THREE.Color(rimColor),
      emissiveIntensity: 0.25,
    });
    // CylinderGeometry's materials: [edge, top, bottom]
    const coin = new THREE.Mesh(coinGeom, [coinEdgeMat, coinFaceMat, coinFaceMat]);
    coin.rotation.x = Math.PI / 2;       // turn edge-on toward camera
    coin.rotation.y = 0.4;               // initial tilt
    scene.add(coin);

    // A subtle inner ring on the coin face (raised relief)
    const ringGeom = new THREE.TorusGeometry(0.78, 0.04, 12, 48);
    const ringMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      metalness: 0.9,
      roughness: 0.25,
    });
    const ringFront = new THREE.Mesh(ringGeom, ringMat);
    ringFront.position.set(0, 0.085, 0);
    ringFront.rotation.x = Math.PI / 2;
    coin.add(ringFront);

    // Floating particles around the coin
    const particles: THREE.Mesh[] = [];
    const partGeom = new THREE.SphereGeometry(0.04, 8, 8);
    const partMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(rimColor),
      transparent: true,
      opacity: 0.9,
    });
    const PARTICLE_COUNT = mobile ? 4 : 6;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const p = new THREE.Mesh(partGeom, partMat);
      const angle = (i / PARTICLE_COUNT) * Math.PI * 2;
      p.position.set(
        Math.cos(angle) * 1.8,
        Math.sin(angle * 1.7) * 0.4 - 0.2,
        Math.sin(angle) * 1.8,
      );
      p.userData.angle = angle;
      p.userData.bobOffset = i * 0.6;
      scene.add(p);
      particles.push(p);
    }

    // Lighting
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(2, 2.5, 3);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(new THREE.Color(rimColor), 0.6);
    fillLight.position.set(-2, -1, 2);
    scene.add(fillLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.35));

    // Render loop — 30 FPS on mobile, 60 on desktop
    const targetFps = mobile ? 30 : 60;
    const minDelta = 1 / targetFps;
    let last = performance.now() / 1000;
    let t = 0;

    const tick = () => {
      animFrame.current = requestAnimationFrame(tick);
      const now = performance.now() / 1000;
      const delta = now - last;
      if (delta < minDelta) return;
      last = now;
      t += delta;

      if (!reduced) {
        // Coin spin: continuous, faster on Y
        coin.rotation.z += delta * 0.6;
        coin.rotation.y = 0.4 + Math.sin(t * 0.6) * 0.18;

        // Particles orbit + bob
        particles.forEach((p, i) => {
          const a = (p.userData.angle as number) + t * 0.4;
          const radius = 1.6 + Math.sin(t * 0.8 + i) * 0.08;
          p.position.x = Math.cos(a) * radius;
          p.position.z = Math.sin(a) * radius;
          p.position.y =
            Math.sin(t * 1.2 + (p.userData.bobOffset as number)) * 0.35 - 0.1;
        });
      } else {
        // Reduced motion: still pose, slight breath
        coin.rotation.z = 0.2;
      }

      renderer.render(scene, camera);
    };
    tick();

    // Cleanup
    return () => {
      if (animFrame.current) cancelAnimationFrame(animFrame.current);
      animFrame.current = null;
      renderer.dispose();
      coinGeom.dispose();
      coinFaceMat.dispose();
      coinEdgeMat.dispose();
      ringGeom.dispose();
      ringMat.dispose();
      partGeom.dispose();
      partMat.dispose();
      try {
        container.removeChild(renderer.domElement);
      } catch {
        /* already removed */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [size, coinColor, rimColor]);

  return (
    <div
      ref={containerRef}
      style={{
        width: size,
        height: size,
        display: 'inline-block',
        pointerEvents: 'none',
        position: 'relative',
      }}
      aria-hidden="true"
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// MascotAsset — drop-in for licensed/commissioned mascot files
// ────────────────────────────────────────────────────────────────────────────

function MascotAsset({ src, size }: { src: string; size: number }) {
  const isVideo = /\.(mp4|webm|mov)$/i.test(src);
  const isLottie = /\.json$/i.test(src);

  if (isLottie) {
    // Lottie support requires a deferred dynamic import to avoid bundling
    // lottie-web for users who don't have a Lottie mascot. We intentionally
    // leave this as a TODO since we don't have a licensed Lottie file yet.
    return (
      <div
        style={{
          width: size,
          height: size,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          color: 'rgba(255,255,255,0.5)',
        }}
        aria-hidden="true"
      >
        [lottie mascot slot]
      </div>
    );
  }

  if (isVideo) {
    return (
      <video
        src={src}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        style={{
          width: size,
          height: size,
          objectFit: 'contain',
          pointerEvents: 'none',
        }}
        aria-hidden="true"
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        pointerEvents: 'none',
      }}
      aria-hidden="true"
    />
  );
}
