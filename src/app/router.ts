import { useSyncExternalStore } from 'react';

/**
 * Enrutador mínimo basado en el hash (#/ruta).
 * Con hash no hace falta configurar nada en GitHub Pages y funciona offline.
 */
export type Route =
  | { name: 'home' }
  | { name: 'path' }
  | { name: 'lesson'; unitId: string; level: number }
  | { name: 'placement'; unitId: string }
  | { name: 'practice' }
  | { name: 'result'; sessionId: string }
  | { name: 'progress' }
  | { name: 'theory'; ruleId?: string }
  | { name: 'parents' }
  | { name: 'install' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [head, a, b] = parts;
  switch (head) {
    case undefined:
    case '':
    case 'inicio':
      return { name: 'home' };
    case 'camino':
      return { name: 'path' };
    case 'leccion':
      if (a && b && /^\d+$/.test(b)) return { name: 'lesson', unitId: a, level: Number(b) };
      return { name: 'path' };
    case 'prueba':
      return a ? { name: 'placement', unitId: a } : { name: 'path' };
    case 'practica':
      return { name: 'practice' };
    case 'resultado':
      return a ? { name: 'result', sessionId: a } : { name: 'home' };
    case 'progreso':
      return { name: 'progress' };
    case 'teoria':
      return a ? { name: 'theory', ruleId: a } : { name: 'theory' };
    case 'padres':
      return { name: 'parents' };
    case 'instalar':
      return { name: 'install' };
    default:
      return { name: 'home' };
  }
}

export function routeToHash(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/';
    case 'path':
      return '#/camino';
    case 'lesson':
      return `#/leccion/${encodeURIComponent(route.unitId)}/${route.level}`;
    case 'placement':
      return `#/prueba/${encodeURIComponent(route.unitId)}`;
    case 'practice':
      return '#/practica';
    case 'result':
      return `#/resultado/${encodeURIComponent(route.sessionId)}`;
    case 'progress':
      return '#/progreso';
    case 'theory':
      return route.ruleId ? `#/teoria/${encodeURIComponent(route.ruleId)}` : '#/teoria';
    case 'parents':
      return '#/padres';
    case 'install':
      return '#/instalar';
  }
}

export function navigate(route: Route, replace = false): void {
  const hash = routeToHash(route);
  if (replace) history.replaceState(null, '', hash);
  else location.hash = hash;
  // replaceState no dispara hashchange: lo notificamos a mano.
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'));
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
}

export function useHash(): string {
  return useSyncExternalStore(subscribe, () => location.hash, () => '');
}

export function useRoute(): Route {
  return parseHash(useHash());
}
