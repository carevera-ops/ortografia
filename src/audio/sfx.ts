/**
 * Sonidos de acierto y error generados con Web Audio (sin archivos).
 * En iOS el contexto de audio solo arranca tras un gesto del usuario: lo creamos al primer toque.
 */
let ctx: AudioContext | null = null;
let enabled = true;

export function setSoundEnabled(v: boolean) {
  enabled = v;
}

function getCtx(): AudioContext | null {
  if (!enabled) return null;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Llamar en un gesto del usuario (p. ej. al tocar "Comprobar") para desbloquear el audio en iOS. */
export function unlockAudio() {
  getCtx();
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = 'sine', gain = 0.18) {
  const c = getCtx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t0 = c.currentTime + start;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + dur + 0.05);
}

export function playCorrect() {
  tone(660, 0, 0.12, 'triangle');
  tone(990, 0.1, 0.22, 'triangle');
}

export function playWrong() {
  tone(220, 0, 0.18, 'sawtooth', 0.08);
  tone(180, 0.14, 0.25, 'sawtooth', 0.08);
}

export function playFinish() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.12, 0.25, 'triangle'));
}
