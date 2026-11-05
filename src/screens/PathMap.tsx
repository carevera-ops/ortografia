import { UNITS } from '../core/content/catalog';
import { navigate } from '../app/router';
import { useContentIndex, usePath } from '../hooks';
import { Mascot } from '../components/Mascot';

/** Camino de unidades en zigzag, como un sendero. */
export function PathMap() {
  const path = usePath();
  const index = useContentIndex();
  return (
    <main className="screen with-tabbar" aria-labelledby="path-title">
      <div className="topbar">
        <h1 id="path-title">Tu camino</h1>
      </div>
      {!path ? (
        <p className="muted">Cargando…</p>
      ) : (
        <ol className="path" aria-label="Unidades">
          {UNITS.map((u, ui) => {
            const unlocked = path.unitUnlocked[u.id];
            const states = path.levelState[u.id] ?? [];
            const soon = !!index && !(u.id in index);
            return (
              <li key={u.id} className={`unit ${unlocked ? 'open' : 'closed'} block-${u.block}`}>
                <div className="unit-header">
                  <span className="unit-emoji" aria-hidden="true">
                    {u.emoji}
                  </span>
                  <div className="grow">
                    <div className="unit-kicker">
                      Unidad {ui + 1} · {u.block === 'A' ? 'Acentuación' : 'Ortografía'}
                    </div>
                    <h2>{u.title}</h2>
                    <div className="muted small-text">{u.subtitle}</div>
                  </div>
                  {!unlocked && <span aria-label="Bloqueada">🔒</span>}
                </div>
                <div className="levels">
                  {states.map((s, li) => {
                    const isNext = path.next?.unitId === u.id && path.next.level === li + 1;
                    const offset = [0, 40, 60, 40, 0][li % 5];
                    const final = li + 1 === u.levels;
                    return (
                      <div key={li} className="level-wrap" style={{ marginLeft: `${offset}%` }}>
                        {isNext && (
                          <div className="next-bubble">
                            <Mascot size={36} />
                            <span>¡Empieza!</span>
                          </div>
                        )}
                        <button
                          className={`level-node ${s}${isNext ? ' next' : ''}${final ? ' final' : ''}`}
                          disabled={s === 'locked'}
                          aria-label={`Nivel ${li + 1}${final ? ' (repaso final)' : ''}: ${
                            s === 'completed' ? 'completado' : s === 'available' ? 'disponible' : 'bloqueado'
                          }`}
                          onClick={() => navigate({ name: 'lesson', unitId: u.id, level: li + 1 })}
                        >
                          {s === 'completed' ? '★' : final ? '🏆' : li + 1}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {soon && <p className="soon">Próximamente 🛠️</p>}
              </li>
            );
          })}
        </ol>
      )}
    </main>
  );
}

