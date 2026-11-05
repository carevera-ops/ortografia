import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { navigate } from '../app/router';
import { Mascot } from '../components/Mascot';
import { UNIT_BY_ID } from '../core/content/catalog';
import { PASS_PCT } from '../core/engine/unlock';
import { PLACEMENT_PASS } from '../core/engine/adaptive';
import { findItems } from '../core/content/loader';
import { useEffect, useState } from 'react';
import type { Item } from '../core/content/schema';
import { correctAnswerText } from '../core/engine/grade';

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m} min ${s} s` : `${s} s`;
}

/** Resumen al terminar: aciertos, XP, tiempo y errores repasables. */
export function Result({ sessionId }: { sessionId: string }) {
  const session = useLiveQuery(() => db.sessions.get(sessionId), [sessionId]);
  const finalDone = useLiveQuery(async () => {
    const s = await db.sessions.get(sessionId);
    const u = s?.unitId ? UNIT_BY_ID.get(s.unitId) : null;
    if (!u) return true;
    const row = await db.levelProgress.get([u.id, u.levels]);
    return !!row && (row.skipped || (row.completed && row.bestPct >= PASS_PCT));
  }, [sessionId]);
  const attempts = useLiveQuery(() => db.attempts.where('sessionId').equals(sessionId).toArray(), [sessionId]);
  const [wrongItems, setWrongItems] = useState<{ item: Item; given: string }[]>([]);

  useEffect(() => {
    if (!attempts) return;
    // Primer intento fallado de cada ítem (los reintentos se registran después).
    const seen = new Set<string>();
    const wrong = attempts.filter((a) => {
      if (seen.has(a.itemId)) return false;
      seen.add(a.itemId);
      return !a.correct;
    });
    void findItems(wrong.map((w) => w.itemId)).then((items) =>
      setWrongItems(items.map((item) => ({ item, given: wrong.find((w) => w.itemId === item.id)!.given }))),
    );
  }, [attempts]);

  if (!session) return <main className="screen" aria-busy="true" />;
  const pct = session.questions ? Math.round((100 * session.correct) / session.questions) : 0;
  const unit = session.unitId ? UNIT_BY_ID.get(session.unitId) : null;
  const isFinalLevel = unit && session.level === unit.levels;
  const title = pct === 100 ? '¡Lección perfecta!' : pct >= PASS_PCT ? '¡Muy bien hecho!' : pct >= 50 ? '¡Buen trabajo!' : '¡Sigue así!';

  return (
    <main className="screen" aria-labelledby="result-title">
      <div className="center" style={{ marginTop: 16 }}>
        <Mascot size={110} bob />
        <h1 id="result-title">{title}</h1>
        {unit && (
          <p className="muted">
            {unit.title} · {session.kind === 'placement' ? 'Prueba de nivel' : `Nivel ${session.level}`}
          </p>
        )}
      </div>
      <div className="stats-grid">
        <div className="stat">
          <span className="stat-value">
            {session.correct}/{session.questions}
          </span>
          <span className="stat-label">aciertos ({pct} %)</span>
        </div>
        <div className="stat">
          <span className="stat-value">+{session.xp}</span>
          <span className="stat-label">XP</span>
        </div>
        <div className="stat">
          <span className="stat-value">{formatTime(session.activeSec)}</span>
          <span className="stat-label">de estudio</span>
        </div>
      </div>
      {session.kind === 'placement' && (
        <p className={`card center ${pct >= PLACEMENT_PASS ? 'highlight' : ''}`}>
          {pct >= PLACEMENT_PASS
            ? '🚀 ¡Ya lo dominas! Has saltado la unidad y se ha abierto la siguiente.'
            : `Necesitabas un ${PLACEMENT_PASS} %. No pasa nada: haz las lecciones de la unidad y lo conseguirás enseguida.`}
        </p>
      )}
      {session.kind === 'lesson' && pct === 100 && unit && session.level! < unit.levels && finalDone === false && (
        <div className="card highlight center">
          <p style={{ marginTop: 0 }}>💯 ¡Perfecto! Si quieres, puedes saltar directamente al repaso final de la unidad.</p>
          <button className="btn block secondary" onClick={() => navigate({ name: 'lesson', unitId: unit.id, level: unit.levels }, true)}>
            ⏩ Ir al repaso final
          </button>
        </div>
      )}
      {isFinalLevel && (
        <p className={`card center ${pct >= PASS_PCT ? 'highlight' : ''}`}>
          {pct >= PASS_PCT
            ? '🎉 ¡Has superado la unidad! Se ha abierto la siguiente.'
            : `Para pasar a la siguiente unidad necesitas un ${PASS_PCT} % en este nivel. ¡Inténtalo otra vez!`}
        </p>
      )}

      {wrongItems.length > 0 && (
        <section className="card">
          <h2>Para repasar</h2>
          <ul className="review-list">
            {wrongItems.map(({ item, given }) => (
              <li key={item.id}>
                <div>
                  <span className="wrong-given">{given}</span> → <strong className="right-answer">{correctAnswerText(item)}</strong>
                </div>
                <div className="muted small-text">{item.explicacion}</div>
              </li>
            ))}
          </ul>
          <p className="muted small-text">Estas preguntas volverán a salir en los próximos días para que no se te olviden.</p>
        </section>
      )}

      <div className="stack" style={{ marginTop: 'auto' }}>
        <button className="btn block" onClick={() => navigate({ name: session.kind === 'practice' ? 'home' : 'path' }, true)}>
          Continuar
        </button>
        {session.kind === 'lesson' && session.unitId && session.level && (
          <button className="btn block ghost" onClick={() => navigate({ name: 'lesson', unitId: session.unitId!, level: session.level! }, true)}>
            Repetir lección
          </button>
        )}
      </div>
    </main>
  );
}
