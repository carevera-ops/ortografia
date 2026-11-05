import { routeToHash, type Route } from '../app/router';

const TABS: { route: Route; label: string; icon: string; match: Route['name'][] }[] = [
  { route: { name: 'home' }, label: 'Inicio', icon: '🏠', match: ['home'] },
  { route: { name: 'path' }, label: 'Camino', icon: '🗺️', match: ['path'] },
  { route: { name: 'practice' }, label: 'Práctica', icon: '🔁', match: ['practice'] },
  { route: { name: 'progress' }, label: 'Progreso', icon: '📊', match: ['progress'] },
  { route: { name: 'theory' }, label: 'Teoría', icon: '📘', match: ['theory'] },
];

export function TabBar({ current }: { current: Route['name'] }) {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <a key={t.label} href={routeToHash(t.route)} aria-current={t.match.includes(current) ? 'page' : undefined}>
          <span className="tab-icon" aria-hidden="true">
            {t.icon}
          </span>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
