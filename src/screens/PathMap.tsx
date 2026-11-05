import { UNITS } from '../core/content/catalog';

/** Camino de unidades. (El desbloqueo real llega en la fase 4.) */
export function PathMap() {
  return (
    <main className="screen with-tabbar" aria-labelledby="path-title">
      <div className="topbar">
        <h1 id="path-title">Tu camino</h1>
      </div>
      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {UNITS.map((u) => (
          <li key={u.id} className="card row">
            <span style={{ fontSize: '1.8rem' }} aria-hidden="true">
              {u.emoji}
            </span>
            <div className="grow">
              <strong>{u.title}</strong>
              <div className="muted" style={{ fontSize: '0.9rem' }}>
                {u.subtitle}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
