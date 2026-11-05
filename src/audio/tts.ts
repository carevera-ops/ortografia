/**
 * Dictado con la voz del sistema (Web Speech API, speechSynthesis) en español de España.
 * En iOS solo suena si se llama desde un gesto del usuario (un toque): por eso el dictado
 * nunca habla solo, siempre con el botón «Escuchar».
 */
let cached: SpeechSynthesisVoice | null | undefined;

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  return (
    voices.find((v) => v.lang === 'es-ES' && v.localService) ??
    voices.find((v) => v.lang === 'es-ES') ??
    voices.find((v) => v.lang.replace('_', '-').startsWith('es-ES')) ??
    voices.find((v) => v.lang.startsWith('es')) ??
    null
  );
}

/** Busca una voz española (las voces se cargan de forma asíncrona en algunos navegadores). */
export function getSpanishVoice(timeoutMs = 1500): Promise<SpeechSynthesisVoice | null> {
  if (cached !== undefined) return Promise.resolve(cached);
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return Promise.resolve((cached = null));
  const now = pickVoice(speechSynthesis.getVoices());
  if (now) return Promise.resolve((cached = now));
  return new Promise((resolve) => {
    const done = () => {
      const v = pickVoice(speechSynthesis.getVoices());
      if (v || Date.now() - start >= timeoutMs) {
        speechSynthesis.removeEventListener('voiceschanged', done);
        cached = v;
        resolve(v);
      }
    };
    const start = Date.now();
    speechSynthesis.addEventListener('voiceschanged', done);
    setTimeout(done, timeoutMs);
  });
}

export function speak(text: string, slow = false): void {
  if (!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'es-ES';
  if (cached) u.voice = cached;
  u.rate = slow ? 0.55 : 0.85;
  speechSynthesis.speak(u);
}
