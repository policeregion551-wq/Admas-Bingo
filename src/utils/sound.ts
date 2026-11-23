let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (Ctx) {
      audioCtx = new Ctx();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = 'sine',
  volume = 0.08,
  delay = 0
) {
  const ctx = getAudioContext();
  if (!ctx) return;

  const start = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);

  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(start);
  osc.stop(start + duration + 0.02);
}

export function playBallCallSound(enabled: boolean) {
  if (!enabled) return;
  playTone(660, 0.14, 'triangle', 0.07, 0);
  playTone(880, 0.18, 'sine', 0.05, 0.06);
}

export function playDaubSound(enabled: boolean) {
  if (!enabled) return;
  playTone(520, 0.08, 'sine', 0.07, 0);
}

export function playMissSound(enabled: boolean) {
  if (!enabled) return;
  playTone(190, 0.14, 'triangle', 0.06, 0);
}

export function playBonusSound(enabled: boolean) {
  if (!enabled) return;
  [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
    playTone(freq, 0.22, 'triangle', 0.08, idx * 0.08);
  });
}

export function playWithdrawSound(enabled: boolean) {
  if (!enabled) return;
  playTone(587.33, 0.16, 'sine', 0.07, 0);
  playTone(880, 0.24, 'sine', 0.08, 0.11);
}

export function playBingoWinSound(enabled: boolean) {
  if (!enabled) return;
  const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
  notes.forEach((freq, idx) => {
    playTone(freq, 0.28, 'triangle', 0.09, idx * 0.09);
  });
}
