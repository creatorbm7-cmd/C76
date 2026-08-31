// V2SoundToggle — the floating casino audio control for the V2 world (Phase P2).
//
// A small glass button pinned above the bottom nav that mutes/unmutes and reveals
// a volume slider. Reuses the shared preferences via the v2audio bus (unified
// with the global c7-sound-* keys). Self-gates to the same /v2 pages as the nav.
// Presentation-only. Honors prefers-reduced-motion (ambience simply won't loop).

import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import { v2audio } from "./v2audio";

const SHOW = (p: string) =>
  p === "/v2" || /^\/v2\/(wallet|vip|analytics|deposit|withdraw|wheel|refer|events|profile|originals)\b/.test(p) ||
  /^\/v3\/(wallet|rewards|profile)\b/.test(p) || p.startsWith("/deposit") || p.startsWith("/withdraw");

export default function V2SoundToggle() {
  const { pathname } = useLocation();
  const [, force] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => v2audio.subscribe(() => force((n) => n + 1)), []);

  // Returning user who already has sound enabled: the browser still needs one
  // gesture before ambience may loop, so resume it on the first interaction.
  useEffect(() => {
    if (v2audio.muted) return;
    const onGesture = () => v2audio.resume();
    window.addEventListener("pointerdown", onGesture, { once: true });
    return () => window.removeEventListener("pointerdown", onGesture);
  }, []);

  if (!SHOW(pathname)) return null;
  const muted = v2audio.muted;

  const toggle = () => {
    v2audio.toggle();
    v2audio.resume(); // this tap is the user gesture that unlocks audio
    if (!muted) setOpen(false);
  };

  return (
    <div className="v2snd">
      <style>{CSS}</style>
      {open && !muted && (
        <input
          className="v2snd-vol"
          type="range" min={0} max={1} step={0.05}
          defaultValue={v2audio.volume}
          onChange={(e) => v2audio.setVolume(parseFloat(e.target.value))}
          aria-label="Volume"
        />
      )}
      <button
        className={`v2snd-btn${muted ? " muted" : ""}`}
        onClick={toggle}
        onDoubleClick={() => setOpen((o) => !o)}
        aria-label={muted ? "Unmute casino sound" : "Mute casino sound"}
        aria-pressed={!muted}
      >
        {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
      </button>
    </div>
  );
}

const CSS = `
.v2snd { position: fixed; right: 12px; bottom: calc(84px + env(safe-area-inset-bottom, 0px)); z-index: 151; display: flex; align-items: center; gap: 8px; }
.v2snd-btn { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; cursor: pointer; color: #052012;
  background: radial-gradient(120% 120% at 50% 12%, rgba(255,255,255,0.55), transparent 52%), linear-gradient(180deg, #8bffc4, #21c07e 55%, #0f7a4a);
  border: 2px solid #0a2410; box-shadow: 0 6px 16px -4px rgba(0,0,0,0.6), 0 0 18px -2px rgba(46,224,138,0.6), inset 0 1px 0 rgba(255,255,255,0.5);
  transition: transform .1s ease; }
.v2snd-btn:active { transform: scale(0.92); }
.v2snd-btn.muted { color: #c9f6e0; background: rgba(10,36,16,0.85); border-color: rgba(246,201,69,0.4); box-shadow: 0 4px 12px -4px rgba(0,0,0,0.6); backdrop-filter: blur(8px); }
.v2snd-vol { width: 96px; height: 6px; accent-color: #21c07e; cursor: pointer;
  background: rgba(10,36,16,0.9); border-radius: 999px; padding: 6px; border: 1px solid rgba(246,201,69,0.35); box-shadow: 0 4px 12px -4px rgba(0,0,0,0.6); backdrop-filter: blur(8px); }
`;
