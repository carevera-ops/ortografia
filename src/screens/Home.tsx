import { useLiveQuery } from 'dexie-react-hooks';
import { Mascot } from '../components/Mascot';
import { GoalRing } from '../components/GoalRing';
import { navigate, routeToHash } from '../app/router';
import { usePath, useSettings, useStreak } from '../hooks';
import { db } from '../db/db';
import { UNIT_BY_ID } from '../core/content/catalog';
import { CHAMPION_MINUTES } from '../core/streak/champion';
import { backupDue } from '../db/backup';

/** Inicio: racha, objetivo del día y "continuar". */
export function Home() {
  const path = usePath();
  const streak = useStreak();
  const settings = useSettings();
  // null = hoy aún no hay registro; undefined = cargando.
  const today = useLiveQuery(async () => (streak ? ((await db.dailyStats.get(streak.today)) ?? null) : undefined), [streak?.today]);
  const next = path?.next;
  const nextUnit = next ? UNIT_BY_ID.get(next.unitId) : null;
  const minutes = Math.floor((today?.activeSec ?? 0) / 60);
  const studied = !!today && today.questions > 0;
  const goal = settings.dailyGoalMin;
  const studiedDays = useLiveQuery(() => db.dailyStats.filter((d) => d.questions > 0).count(), []) ?? 0;
  const needsBackup = backupDue(settings.lastBackupAt, studiedDays);

  // Hasta tener los datos no se pinta el contenido (así no «salta» la pantalla al cargar).
  const ready = !!streak && !!path && today !== undefined;

  return (
    <main className="screen with-tabbar" aria-labelledby="home-title" aria-busy={!ready}>
      <div className="topbar">
        <h1 id="home-title">¡Hola!</h1>
        {streak && (
          <a className={`streak-chip${streak.todayDone ? ' lit' : ''}`} href={routeToHash({ name: 'progress' })} aria-label={`Racha de ${streak.current} días${streak.freezes ? `, ${streak.freezes} protectores` : ''}`}>
            <span aria-hidden="true">🔥</span> {streak.current}
            {streak.freezes > 0 && (
              <span className="freeze-chip" aria-hidden="true">
                🧊{streak.freezes > 1 ? `×${streak.freezes}` : ''}
              </span>
            )}
          </a>
        )}
        <a className="icon-btn" href={routeToHash({ name: 'parents' })} aria-label="Zona de padres">
          ⚙️
        </a>
      </div>

      {!ready ? null : (
        <>
      {streak && !streak.todayDone && (
        <section className="card reminder" role="status">
          <span className="reminder-flame anim-bob" aria-hidden="true">
            🔥
          </span>
          <div>
            <strong>
              {streak.current > 0
                ? `¡Tu racha de ${streak.current} ${streak.current === 1 ? 'día' : 'días'} te espera!`
                : '¡Empieza hoy una racha nueva!'}
            </strong>
            <div className="muted small-text">
              {settings.streakCriterion === 'minutes'
                ? `Estudia ${settings.streakMinutes} minutos para que hoy cuente.`
                : settings.streakCriterion === 'lesson'
                  ? 'Haz una lección para que hoy cuente.'
                  : `Haz una lección o estudia ${settings.streakMinutes} minutos para que hoy cuente.`}
            </div>
          </div>
        </section>
      )}

      <section className="card highlight row">
        {goal > 0 ? <GoalRing minutes={minutes} goal={goal} /> : <Mascot size={72} bob />}
        <div className="grow">
          {studied ? (
            <>
              <strong>{minutes >= goal && goal > 0 ? '¡Objetivo de hoy cumplido! 🎉' : `¡Hoy ya llevas ${today!.xp} XP!`}</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {today!.lessons} {today!.lessons === 1 ? 'lección' : 'lecciones'} · {minutes} min · {Math.round((100 * today!.correct) / today!.questions)} % de aciertos
              </p>
              {!today!.celebrated && minutes < CHAMPION_MINUTES && (
                <p className="small-text" style={{ margin: '6px 0 0' }}>
                  🏆 Reto: llega a {CHAMPION_MINUTES} min con más de un 90 % de aciertos.
                </p>
              )}
              {today!.celebrated && <p className="small-text" style={{ margin: '6px 0 0' }}>🏆 ¡Hoy has sido un campeón!</p>}
            </>
          ) : (
            <>
              <strong>¿Listo para practicar?</strong>
              <p className="muted" style={{ margin: '4px 0 0' }}>
                {goal > 0 ? `Tu objetivo de hoy: ${goal} minutos.` : 'Una lección son solo 3 minutos.'}
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
            {studied ? 'Continuar' : 'Empezar'}
          </button>
        </section>
      )}
      <a className="btn block secondary" href={routeToHash({ name: 'practice' })}>
        🔁 Práctica libre
      </a>
      {needsBackup && (
        <a className="card backup-hint" href={routeToHash({ name: 'parents' })}>
          💾 <span>Pide a un adulto que haga una <strong>copia de seguridad</strong> de tu progreso (Zona de padres).</span>
        </a>
      )}
        </>
      )}
    </main>
  );
}
