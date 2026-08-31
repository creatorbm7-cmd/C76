import { useEffect, useCallback, useState } from 'react';
import { c7Theme } from '@/theme/c7-sun27-compat';
import { playSynth, unlockSynth, setSynthVolume } from '@/lib/sound-synth';

type SoundKey = keyof typeof c7Theme.sound;

const STORAGE_KEY = 'c7-sound-muted';
const VOLUME_KEY = 'c7-sound-volume';

/**
 * useSound — Plays sounds via the Web Audio synthesizer.
 *
 * v3: Skips the MP3 fetch (we don't ship audio files — the synth is the
 * primary path). If MP3s are added later, drop them into /public/sounds/
 * and switch to the file-then-synth fallback path.
 *
 * - Respects user mute (localStorage 'c7-sound-muted')
 * - Volume control 0..1 applied to synth master gain (localStorage 'c7-sound-volume')
 * - Unlocks AudioContext on first user gesture (autoplay policy)
 *
 * Usage:
 *   const { play, muted, toggleMute, volume, setVolume } = useSound();
 *   play('buttonClick');
 *   play('jackpot');
 */
export function useSound() {
  const [muted, setMuted] = useState(() => {
    // Silent by default: sound effects are muted unless the user has explicitly
    // unmuted (STORAGE_KEY === '0'). Unset or '1' → muted.
    if (typeof window === 'undefined') return true;
    return localStorage.getItem(STORAGE_KEY) !== '0';
  });
  const [volume, setVolumeState] = useState(() => {
    if (typeof window === 'undefined') return 0.7;
    const v = parseFloat(localStorage.getItem(VOLUME_KEY) || '0.7');
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.7;
  });

  // Apply initial volume to synth master gain
  useEffect(() => {
    setSynthVolume(volume);
  }, [volume]);

  // Persist mute
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  }, [muted]);

  // Persist volume
  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  const play = useCallback((key: SoundKey) => {
    if (muted) return;
    if (typeof window === 'undefined') return;
    // Ensure context is awake before playing
    unlockSynth();
    playSynth(key as Parameters<typeof playSynth>[0]);
  }, [muted]);

  const toggleMute = useCallback(() => setMuted(m => !m), []);
  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    setVolumeState(clamped);
  }, []);

  // Aggressive AudioContext unlock on first user interaction
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onInteract = () => {
      unlockSynth();
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
    window.addEventListener('pointerdown', onInteract, { once: true });
    window.addEventListener('touchstart', onInteract, { once: true });
    window.addEventListener('keydown',    onInteract, { once: true });
    return () => {
      window.removeEventListener('pointerdown', onInteract);
      window.removeEventListener('touchstart', onInteract);
      window.removeEventListener('keydown', onInteract);
    };
  }, []);

  return { play, muted, toggleMute, volume, setVolume };
}

export default useSound;
