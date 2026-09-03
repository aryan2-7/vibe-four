// src/lib/sounds.ts — WebAudio tiny synth, no files needed
let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

export function playTone(freq: number, duration: number, type: OscillatorType = "sine", gain = 0.15) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.value = gain;
  o.connect(g);
  g.connect(c.destination);
  const now = c.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.01, now + duration);
  o.start(now);
  o.stop(now + duration);
}

export function sfxDrop(isMuted: boolean) {
  if (isMuted) return;
  playTone(320, 0.12, "sine", 0.18);
  setTimeout(() => playTone(480, 0.08, "sine", 0.12), 60);
}

export function sfxWin(isMuted: boolean) {
  if (isMuted) return;
  [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => playTone(f, 0.25, "sine", 0.2), i * 110));
}

export function sfxClick(isMuted: boolean) {
  if (isMuted) return;
  playTone(800, 0.06, "square", 0.08);
}

export function sfxError(isMuted: boolean) {
  if (isMuted) return;
  playTone(180, 0.2, "sawtooth", 0.12);
}

export function triggerHaptic(pattern: number | number[] = 20) {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {}
  }
}
