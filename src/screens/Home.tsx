import { useLiveQuery } from 'dexie-react-hooks';
import { Mascot } from '../components/Mascot';
import { navigate, routeToHash } from '../app/router';
import { usePath } from '../hooks';
import { db } from '../db/db';
import { toLocalDate } from '../core/time/dates';
import { UNIT_BY_ID } from '../core/content/catalog';

/** Inicio: lo de hoy y "continuar". (La racha completa llega en la fase 6.) */
export function Home() {
  const path = usePath();
  const today = useLiveQuery(() => db.dailyStats.get(toLocalDate()), []);
  const next = path?.next;
  const nextUnit = next ? UNIT_BY_ID.get(next.unitId) : null;
  const minutes = Math.floor((today?.activeSec ?? 0) / 60);

  return (
    <main className="screen with-tabbar" aria-labelledby="home-title">
      <div className="topbar">
        <h1 id="home-title">¡Hola!</h1>
        <a className="icon-btn" href={routeToHash({ name: 'parents' })} aria-label="Zona de padres">
          ⚙️
        </a>
      </div>

      <section className="card highlight row">
        <Mascot size={72} bob />
        <div className="grow">
          {today && today.questions > 0 ? (
            <>
              <strong>¡Hoy ya llevas {today.xp} XP!</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {today.lessons} {today.lessons === 1 ? 'lección' : 'lecciones'} · {minutes} min · {today.correct}/{today.questions} aciertos
              </p>
            </>
          ) : (
            <>
              <strong>¿Listo para practicar?</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                Hoy todavía no has estudiado. ¡Una lección son solo 3 minutos!
              </p>
            </>
          )}
        </div>
      </section>

      {next && nextUnit && (
        <section className="card">
          <div className="muted small-text">Siguiente lección</div>
          <h2 style={{ margin: '4px 0' }}>
            {nextUnit.emoji} {nextUnit.title}
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Nivel {next.level} de {nextUnit.levels}
          </p>
          <button className="btn block" onClick={() => navigate({ name: 'lesson', unitId: next.unitId, level: next.level })}>
            {today && today.questions > 0 ? 'Continuar' : 'Empezar'}
          </button>
        </section>
      )}
      <a className="btn block secondary" href={routeToHash({ name: 'practice' })}>
        🔁 Práctica libre
      </a>
    </main>
  );
}
