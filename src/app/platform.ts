/**
 * Detección de plataforma: ¿es iOS? ¿la app está instalada (standalone)?
 */
declare global {
  interface Navigator {
    /** Propiedad no estándar de Safari en iOS. */
    standalone?: boolean;
  }
}

export function isIOS(): boolean {
  const ua = navigator.userAgent;
  // Los iPad con iPadOS 13+ se presentan como Mac con pantalla táctil.
  return /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

export function isStandalone(): boolean {
  if (navigator.standalone === true) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

/** true si estamos en Safari de iOS SIN instalar: ahí conviene mostrar la ayuda de instalación. */
export function shouldSuggestInstall(): boolean {
  return navigator.standalone === false && isIOS();
}

const SKIP_KEY = 'tildin.skipInstall';
export function installSkipped(): boolean {
  try {
    return sessionStorage.getItem(SKIP_KEY) === '1';
  } catch {
    return false;
  }
}
export function skipInstall(): void {
  try {
    sessionStorage.setItem(SKIP_KEY, '1');
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

/** Pide al navegador que no borre nuestros datos (IndexedDB) por falta de espacio. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* algunos navegadores lanzan si no hay permiso */
  }
  return false;
}
