import { useCallback, useEffect, useRef, useState } from 'react';
import type { Item, Rule } from '../core/content/schema';
import { Exercise } from '../exercises/Exercise';
import { answerText, correctAnswerText, grade, type AnswerValue } from '../core/engine/grade';
import { xpFor } from '../core/engine/xp';
import { buildLesson, buildPractice } from '../core/engine/lessonBuilder';
import { computePath } from '../core/engine/unlock';
import { UNITS, UNIT_BY_ID } from '../core/content/catalog';
import { findItems, loadIndex, loadRules, loadUnit, loadUnits } from '../core/content/loader';
import { ActiveTimer } from '../core/timer/activeTimer';
import { addActiveTime, finishSession, getDueItemIds, getMasteryMap, getRecentItemIds, recordAnswer, startSession } from '../db/repo';
import { db, getSettings } from '../db/db';
import { navigate } from '../app/router';
import { playCorrect, playFinish, playWrong, setSoundEnabled, unlockAudio } from '../audio/sfx';
import { Mascot } from '../components/Mascot';
import { getSpanishVoice } from '../audio/tts';

type Mode = { kind: 'lesson'; unitId: string; level: number } | { kind: 'practice' };

interface QueueEntry {
  item: Item;
  firstTry: boolean;
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

async function prepare(mode: Mode): Promise<Item[]> {
  const [mastery, dueIds, recent, unlocked, voice] = await Promise.all([
    getMasteryMap(),
    getDueItemIds(),
    getRecentItemIds(),
    unlockedUnitIds(),
    getSpanishVoice(),
  ]);
  // Sin voz española no hay dictado: se ocultan esos ejercicios.
  const usable = (items: Item[]) => (voice ? items : items.filter((i) => i.tipo !== 'dictado'));
  const dueAll = await findItems(dueIds);
  const dueItems = usable(dueAll.filter((i) => unlocked.includes(i.id.split('-')[0]!)));
  if (mode.kind === 'practice') {
    const pool = usable(await loadUnits(unlocked));
    return buildPractice(pool, mastery, dueItems, 10);
  }
  const unit = UNIT_BY_ID.get(mode.unitId)!;
  const unitItems = usable(await loadUnit(mode.unitId));
  const prevIds = unlocked.filter((id) => id !== mode.unitId).slice(-3);
  const reviewPool = prevIds.length ? usable(await loadUnits(prevIds)) : [];
  return buildLesson({ unitItems, level: mode.level, levels: unit.levels, mastery, dueItems, reviewPool, recentIds: recent });
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
  const doneFirst = useRef(0);
  const modeKey = mode.kind === 'lesson' ? `${mode.unitId}/${mode.level}` : 'practice';

  // Preparar la lección y arrancar la sesión y el cronómetro.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const settings = await getSettings();
        setSoundEnabled(settings.sound);
        const [items, r] = await Promise.all([prepare(mode), loadRules()]);
        if (cancelled) return;
        if (items.length === 0) throw new Error('No hay preguntas disponibles todavía.');
        setRules(r);
        firstCount.current = items.length;
        const sid = await startSession(mode.kind, mode.kind === 'lesson' ? mode.unitId : null, mode.kind === 'lesson' ? mode.level : null);
        sessionRef.current = sid;
        const timer = new ActiveTimer({ onFlush: (sec) => void addActiveTime(sid, sec) });
        timer.start();
        timerRef.current = timer;
        setQueue(items.map((item) => ({ item, firstTry: true })));
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
    await finishSession(sid);
    playFinish();
    navigate({ name: 'result', sessionId: sid }, true);
  }, []);

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
    // Lo fallado vuelve a salir al final (una vez), como en Duolingo.
    if (!ok && current.firstTry) setQueue((q) => [...q!, { item: current.item, firstTry: false }]);
  };

  const next = async () => {
    if (!queue) return;
    if (pos + 1 >= queue.length) {
      if (mode.kind === 'practice') {
        // Práctica libre: infinita. Se añade otra tanda.
        const more = await prepare(mode);
        setQueue((q) => [...q!, ...more.map((item) => ({ item, firstTry: true }))]);
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
  const unit = mode.kind === 'lesson' ? UNIT_BY_ID.get(mode.unitId) : null;
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
                  navigate({ name: mode.kind === 'lesson' ? 'path' : 'home' }, true);
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
