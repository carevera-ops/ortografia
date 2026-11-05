import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item, Rule } from '../core/content/schema';
import { Exercise } from '../exercises/Exercise';
import { answerText, correctAnswerText, grade, type AnswerValue } from '../core/engine/grade';
import { xpFor } from '../core/engine/xp';
import { buildLesson, buildPractice } from '../core/engine/lessonBuilder';
import { adaptQueue, buildPlacement, PLACEMENT_PASS, wordKey, type QueueEntry } from '../core/engine/adaptive';
import { computePath } from '../core/engine/unlock';
import { UNITS, UNIT_BY_ID } from '../core/content/catalog';
import { findItems, loadIndex, loadRules, loadUnit, loadUnits } from '../core/content/loader';
import { ActiveTimer } from '../core/timer/activeTimer';
import { addActiveTime, finishSession, skipUnit, getDueItemIds, getMasteryMap, getRecentItemIds, recordAnswer, startSession } from '../db/repo';
import { db, getSettings } from '../db/db';
import { navigate } from '../app/router';
import { playCorrect, playFinish, playWrong, setSoundEnabled, unlockAudio } from '../audio/sfx';
import { Mascot } from '../components/Mascot';
import { getSpanishVoice } from '../audio/tts';

type Mode = { kind: 'lesson'; unitId: string; level: number } | { kind: 'placement'; unitId: string } | { kind: 'practice' };

interface Prepared {
  items: QueueEntry[];
  /** Preguntas de reserva para la adaptación de dificultad. */
  reserve: Item[];
}

const PRAISE = ['¡Genial!', '¡Muy bien!', '¡Perfecto!', '¡Eso es!', '¡Bravo!', '¡Así se hace!'];
const ENCOURAGE = ['¡Casi!', 'No pasa nada', '¡A la próxima!', 'Equivocarse es aprender'];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)]!;

/** Unidades desbloqueadas (con contenido) y las anteriores a la actual. */
async function unlockedUnitIds(): Promise<string[]> {
  const [index, rows, settings] = await Promise.all([loadIndex(), db.levelProgress.toArray(), getSettings()]);
  const path = computePath(UNITS, rows, new Set(Object.keys(index)), settings.unlockAll);
  return UNITS.filter((u) => path.unitUnlocked[u.id]).map((u) => u.id);
}

async function prepare(mode: Mode): Promise<Prepared> {
  const [mastery, dueIds, recent, unlocked, voice] = await Promise.all([
    getMasteryMap(),
    getDueItemIds(),
    getRecentItemIds(),
    unlockedUnitIds(),
    getSpanishVoice(),
  ]);
  // Sin voz española no hay dictado: se ocultan esos ejercicios.
  const usable = (items: Item[]) => (voice ? items : items.filter((i) => i.tipo !== 'dictado'));
  const main = (item: Item): QueueEntry => ({ item, firstTry: true, role: 'main' });
  if (mode.kind === 'placement') {
    const unitItems = usable(await loadUnit(mode.unitId));
    return { items: buildPlacement(unitItems).map(main), reserve: [] };
  }
  const dueAll = await findItems(dueIds);
  const dueItems = usable(dueAll.filter((i) => unlocked.includes(i.id.split('-')[0]!)));
  if (mode.kind === 'practice') {
    const pool = usable(await loadUnits(unlocked));
    return { items: buildPractice(pool, mastery, dueItems, 10).map(main), reserve: pool };
  }
  const unit = UNIT_BY_ID.get(mode.unitId)!;
  const unitItems = usable(await loadUnit(mode.unitId));
  const prevIds = unlocked.filter((id) => id !== mode.unitId).slice(-3);
  const reviewPool = prevIds.length ? usable(await loadUnits(prevIds)) : [];
  const plan = buildLesson({ unitItems, level: mode.level, levels: unit.levels, mastery, dueItems, reviewPool, recentIds: recent });
  return {
    items: plan.map((item) => ({ item, firstTry: true, role: item.id.startsWith(`${mode.unitId}-`) ? 'main' : 'extra' })),
    reserve: unitItems,
  };
}

/** Ficha de teoría en una hoja superpuesta (sin salir de la lección). */
export function RuleSheet({ rule, onClose }: { rule: Rule; onClose: () => void }) {
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="rule-title" onClick={(e) => e.stopPropagation()}>
        <RuleCard rule={rule} titleId="rule-title" />
        <button className="btn block" onClick={onClose} autoFocus>
          Entendido
        </button>
      </div>
    </div>
  );
}

export function RuleCard({ rule, titleId }: { rule: Rule; titleId?: string }) {
  return (
    <article className="rule">
      <h2 id={titleId}>{rule.titulo}</h2>
      <p className="rule-summary">{rule.resumen}</p>
      <ul>
        {rule.explicacion.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <p>
        <strong>Ejemplos:</strong> {rule.ejemplos.join(', ')}
      </p>
      {rule.contraejemplos.length > 0 && (
        <p>
          <strong>Cuidado:</strong> {rule.contraejemplos.join(', ')}
        </p>
      )}
      {rule.truco && <p className="tip">💡 {rule.truco}</p>}
    </article>
  );
}

export function Lesson({ mode }: { mode: Mode }) {
  const [queue, setQueue] = useState<QueueEntry[] | null>(null);
  const [pos, setPos] = useState(0);
  const [answer, setAnswer] = useState<AnswerValue | null>(null);
  const [verdict, setVerdict] = useState<'correct' | 'wrong' | null>(null);
  const [combo, setCombo] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [rule, setRule] = useState<Rule | null>(null);
  const [rules, setRules] = useState<Map<string, Rule>>(new Map());
  const [confirmExit, setConfirmExit] = useState(false);
  const [message, setMessage] = useState('');
  const sessionRef = useRef<string | null>(null);
  const timerRef = useRef<ActiveTimer | null>(null);
  const shownAt = useRef(Date.now());
  const firstCount = useRef(0);
  const reserveRef = useRef<Item[]>([]);
  const wrongStreak = useRef(0);
  const usedWords = useRef(new Set<string>());
  const doneFirst = useRef(0);
  const modeKey = mode.kind === 'lesson' ? `${mode.unitId}/${mode.level}` : mode.kind === 'placement' ? `p/${mode.unitId}` : 'practice';

  // Preparar la lección y arrancar la sesión y el cronómetro.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getSettings();
        setSoundEnabled(settings.sound);
        const [prep, r] = await Promise.all([prepare(mode), loadRules()]);
        if (cancelled) return;
        const items = prep.items;
        if (items.length === 0) throw new Error('No hay preguntas disponibles todavía.');
        reserveRef.current = prep.reserve;
        setRules(r);
        firstCount.current = items.length;
        const sid = await startSession(
          mode.kind,
          mode.kind === 'practice' ? null : mode.unitId,
          mode.kind === 'lesson' ? mode.level : null,
        );
        sessionRef.current = sid;
        const timer = new ActiveTimer({ onFlush: (sec) => void addActiveTime(sid, sec) });
        timer.start();
        timerRef.current = timer;
        setQueue(items);
        shownAt.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      cancelled = true;
      timerRef.current?.stop();
    };
  }, [modeKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const current = queue?.[pos];

  const finish = useCallback(async () => {
    timerRef.current?.stop();
    const sid = sessionRef.current;
    if (!sid) return;
    const done = await finishSession(sid);
    // Prueba de nivel aprobada: la unidad queda superada y se abre la siguiente.
    if (mode.kind === 'placement' && done && done.questions > 0) {
      const pct = Math.round((100 * done.correct) / done.questions);
      if (pct >= PLACEMENT_PASS) await skipUnit(mode.unitId, UNIT_BY_ID.get(mode.unitId)!.levels, pct);
    }
    playFinish();
    navigate({ name: 'result', sessionId: sid }, true);
  }, [mode]);

  const check = async () => {
    if (!current || answer === null || verdict) return;
    unlockAudio();
    const ok = grade(current.item, answer);
    setVerdict(ok ? 'correct' : 'wrong');
    setMessage(ok ? pick(PRAISE) : pick(ENCOURAGE));
    const newCombo = ok ? combo + 1 : 0;
    setCombo(newCombo);
    if (ok) playCorrect();
    else playWrong();
    const xp = ok && current.firstTry ? xpFor(current.item.dificultad, newCombo) : 0;
    if (current.firstTry) doneFirst.current++;
    await recordAnswer({
      sessionId: sessionRef.current!,
      item: current.item,
      correct: ok,
      given: answerText(current.item, answer),
      ms: Date.now() - shownAt.current,
      xp,
      firstTry: current.firstTry,
    });
    usedWords.current.add(wordKey(current.item));
    wrongStreak.current = ok ? 0 : wrongStreak.current + 1;
    setQueue((q) => {
      let nq = q!;
      // Lo fallado vuelve a salir al final (una vez), como en Duolingo; en la prueba de nivel, no.
      if (!ok && current.firstTry && mode.kind !== 'placement') nq = [...nq, { item: current.item, firstTry: false, role: 'extra' }];
      // Dificultad adaptativa: con racha de aciertos, la siguiente es más difícil; con 2 fallos, más fácil.
      if (mode.kind !== 'placement') nq = adaptQueue(nq, pos + 1, reserveRef.current, newCombo, wrongStreak.current, usedWords.current);
      return nq;
    });
  };

  const next = async () => {
    if (!queue) return;
    if (pos + 1 >= queue.length) {
      if (mode.kind === 'practice') {
        // Práctica libre: infinita. Se añade otra tanda.
        const more = await prepare(mode);
        setQueue((q) => [...q!, ...more.items]);
      } else {
        await finish();
        return;
      }
    }
    setPos((p) => p + 1);
    setAnswer(null);
    setVerdict(null);
    shownAt.current = Date.now();
  };

  if (error) {
    return (
      <main className="screen center">
        <Mascot size={96} />
        <p>{error}</p>
        <button className="btn" onClick={() => navigate({ name: 'path' })}>
          Volver al camino
        </button>
      </main>
    );
  }
  if (!queue || !current) {
    return (
      <main className="screen center" aria-busy="true">
        <div style={{ marginTop: '30dvh' }}>
          <Mascot size={96} bob />
          <p className="muted">Preparando tu lección…</p>
        </div>
      </main>
    );
  }

  const progress = mode.kind === 'practice' ? Math.min(1, (doneFirst.current % 10) / 10) : doneFirst.current / firstCount.current;
  const unit = mode.kind !== 'practice' ? UNIT_BY_ID.get(mode.unitId) : null;
  const itemRule = rules.get(current.item.regla_id);

  return (
    <main className="screen lesson" aria-label={unit ? `Lección: ${unit.title}` : 'Práctica libre'}>
      <div className="lesson-top">
        <button className="icon-btn" aria-label="Salir de la lección" onClick={() => setConfirmExit(true)}>
          ✕
        </button>
        <div
          className="progress"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          aria-label="Progreso de la lección"
        >
          <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
        {combo >= 3 ? (
          <span className="combo anim-pop" key={combo} aria-label={`${combo} aciertos seguidos`}>
            🔥{combo}
          </span>
        ) : (
          <span className="combo-placeholder" />
        )}
        {mode.kind === 'practice' && (
          <button className="btn small ghost" onClick={() => void finish()}>
            Terminar
          </button>
        )}
      </div>

      {!current.firstTry && <p className="retry-tag">🔁 Vamos a repasar esta</p>}
      {current.adapted === 'up' && (
        <p className="boost-tag anim-pop" key={`b${pos}`}>
          ⚡ ¡Vas tan bien que subimos el nivel!
        </p>
      )}
      {mode.kind === 'placement' && pos === 0 && <p className="retry-tag">🎯 Prueba de nivel: necesitas un {PLACEMENT_PASS} % para saltar la unidad.</p>}
      <h1 className="prompt">{current.item.enunciado}</h1>

      <div className="exercise-area" key={`${pos}-${current.item.id}`}>
        <Exercise item={current.item} locked={verdict !== null} verdict={verdict} onChange={setAnswer} />
      </div>

      {verdict === null ? (
        <div className="lesson-bottom">
          <button className="btn block" disabled={answer === null} onClick={() => void check()}>
            Comprobar
          </button>
        </div>
      ) : (
        <div className={`feedback ${verdict}`} role="status" aria-live="assertive">
          <div className={`feedback-title ${verdict === 'correct' ? 'anim-pop' : 'anim-shake'}`}>
            {verdict === 'correct' ? '✔' : '✘'} {message}
          </div>
          {verdict === 'wrong' && (
            <p className="feedback-answer">
              Respuesta correcta: <strong>{correctAnswerText(current.item)}</strong>
            </p>
          )}
          <p className="feedback-expl">{current.item.explicacion}</p>
          <div className="row">
            {itemRule && (
              <button className="btn small ghost" onClick={() => setRule(itemRule)}>
                Ver regla
              </button>
            )}
            <button className={`btn grow ${verdict === 'correct' ? 'ok' : 'ko'}`} onClick={() => void next()} autoFocus>
              Continuar
            </button>
          </div>
        </div>
      )}

      {rule && <RuleSheet rule={rule} onClose={() => setRule(null)} />}
      {confirmExit && (
        <div className="sheet-backdrop" onClick={() => setConfirmExit(false)}>
          <div className="sheet center" role="dialog" aria-modal="true" aria-labelledby="exit-title" onClick={(e) => e.stopPropagation()}>
            <Mascot size={72} />
            <h2 id="exit-title">¿Seguro que quieres salir?</h2>
            <p className="muted">El tiempo que has estudiado se guarda, pero la lección no contará como terminada.</p>
            <div className="stack">
              <button className="btn block" onClick={() => setConfirmExit(false)} autoFocus>
                Seguir aprendiendo
              </button>
              <button
                className="btn block ghost"
                onClick={() => {
                  timerRef.current?.stop();
                  navigate({ name: mode.kind === 'practice' ? 'home' : 'path' }, true);
                }}
              >
                Salir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
