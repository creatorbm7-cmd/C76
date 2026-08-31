// Casino sound effects using Web Audio API — zero dependencies, instant playback

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  gainVal = 0.15,
  fadeOut = true
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.value = gainVal;
  if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

/** Short click / UI tap */
export function playClick() {
  playTone(800, 0.06, "square", 0.08);
}

/** Bet placed confirmation */
export function playBetPlaced() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(600, t + 0.1);
  gain.gain.setValueAtTime(0.12, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.15);
}

/** Win — ascending arpeggio */
export function playWin() {
  const notes = [523, 659, 784, 1047]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.25, "sine", 0.14), i * 80);
  });
}

/** Big win — richer arpeggio with shimmer */
export function playBigWin() {
  const notes = [523, 659, 784, 1047, 1319]; // C5-E6
  notes.forEach((freq, i) => {
    setTimeout(() => {
      playTone(freq, 0.4, "sine", 0.15);
      playTone(freq * 1.005, 0.4, "sine", 0.08); // slight detune for shimmer
    }, i * 100);
  });
}

/** Loss — descending tone */
export function playLoss() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(400, t);
  osc.frequency.linearRampToValueAtTime(200, t + 0.3);
  gain.gain.setValueAtTime(0.1, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + 0.35);
}

/** Coin flip sound */
export function playCoinFlip() {
  [0, 60, 120, 180].forEach((delay) => {
    setTimeout(() => playTone(1200 + Math.random() * 400, 0.05, "square", 0.06), delay);
  });
}

/** Dice roll — rattling */
export function playDiceRoll() {
  for (let i = 0; i < 6; i++) {
    setTimeout(
      () => playTone(600 + Math.random() * 800, 0.04, "square", 0.05),
      i * 40
    );
  }
}

/** Mine reveal — safe tile */
export function playRevealSafe() {
  playTone(880, 0.12, "sine", 0.12);
  setTimeout(() => playTone(1100, 0.1, "sine", 0.1), 60);
}

/** Mine reveal — bomb */
export function playRevealBomb() {
  const ctx = getCtx();
  const t = ctx.currentTime;
  // White noise burst
  const bufferSize = ctx.sampleRate * 0.3;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.15, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
  noise.connect(gain).connect(ctx.destination);
  noise.start(t);
  // Low thud
  playTone(80, 0.3, "sine", 0.2);
}

/** Crash game — rising tension */
export function playCrashTick() {
  playTone(1000 + Math.random() * 200, 0.03, "sine", 0.04);
}

/** Crash game — explosion */
export function playCrashBoom() {
  playRevealBomb();
  setTimeout(() => playTone(60, 0.4, "sine", 0.18), 50);
}

/** Plinko ball bounce */
export function playPlinkoBounce() {
  playTone(1200 + Math.random() * 600, 0.04, "triangle", 0.06);
}

/** Cashout success */
export function playCashout() {
  const notes = [660, 880, 1100];
  notes.forEach((f, i) => setTimeout(() => playTone(f, 0.15, "sine", 0.12), i * 60));
}
