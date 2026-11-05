import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import { useSettings, useStreak } from '../hooks';
import { BarChart, Heatmap, longDate, type BarDatum, type HeatDay } from '../components/charts';
import { addDays, parseLocalDate, type LocalDate } from '../core/time/dates';
import { SKILL_LABEL } from '../core/content/catalog';
import { isChampionDay } from '../core/streak/champion';
import type { Settings } from '../db/types';

const WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h) return `${h} h ${m} min`;
  return `${m} min`;
}

/** Mi progreso: racha, minutos por día, calendario, totales, aciertos por habilidad y palabras difíciles. */
export function Progress() {
  const streak = useStreak();
  const settings = useSettings();
  const [range, setRange] = useState<'week' | 'month'>('week');
  const days = useLiveQuery(() => db.dailyStats.toArray(), []);
  const skills = useLiveQuery(() => db.skillMastery.toArray(), []);
  const hard = useLiveQuery(async () => {
    const wrong = await db.attempts.filter((a) => !a.correct).toArray();
    const count = new Map<string, number>();
    for (const a of wrong) count.set(a.target, (count.get(a.target) ?? 0) + 1);
    return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, []);

  if (!days || !streak) return <main className="screen with-tabbar" aria-busy="true" />;

  const byDate = new Map(days.map((d) => [d.date, d]));
  const today = streak.today;
  const n = range === 'week' ? 7 : 30;
  const bars: BarDatum[] = Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i - (n - 1));
    const min = Math.floor((byDate.get(d)?.activeSec ?? 0) / 60);
    return {
      key: d,
      label: range === 'week' ? WD[parseLocalDate(d).getDay()]! : String(parseLocalDate(d).getDate()),
      title: longDate(d),
      value: min,
      highlight: d === today,
    };
  });

  const heat = new Map<LocalDate, HeatDay>(
    days.map((d) => [
      d.date,
      {
        minutes: Math.floor(d.activeSec / 60),
        lessons: d.lessons,
        streak: streak.streakDays.has(d.date),
        freeze: false,
        champion: isChampionDay(d),
      },
    ]),
  );
  for (const f of streak.freezeDays) heat.set(f, { ...(heat.get(f) ?? { minutes: 0, lessons: 0, streak: false, champion: false }), freeze: true });

  const totalSec = days.reduce((a, d) => a + d.activeSec, 0);
  const totalXp = days.reduce((a, d) => a + d.xp, 0);
  const lessons = days.reduce((a, d) => a + d.lessons, 0);
  const totalQ = days.reduce((a, d) => a + d.questions, 0);
  const totalC = days.reduce((a, d) => a + d.correct, 0);
  const weekSec = bars.slice(-7).reduce((a, b) => a + b.value * 60, 0);
  const skillRows = (skills ?? []).filter((s) => s.attempts > 0).sort((a, b) => b.attempts - a.attempts);

  return (
    <main className="screen with-tabbar" aria-labelledby="progress-title">
      <div className="topbar">
        <h1 id="progress-title">Mi progreso</h1>
      </div>

      <section className="card streak-card" aria-label="Racha">
        <div className="streak-big">
          <span className={`flame${streak.todayDone ? ' lit' : ''}`} aria-hidden="true">
            🔥
          </span>
          <div>
            <div className="streak-num">
              {streak.current} {streak.current === 1 ? 'día' : 'días'}
            </div>
            <div className="muted small-text">racha actual</div>
          </div>
        </div>
        <div className="streak-side">
          <div>
            🏅 <strong>{streak.best}</strong> <span className="muted small-text">récord</span>
          </div>
          <div aria-label={`${streak.freezes} protectores de racha`}>
            🧊 <strong>{streak.freezes}</strong>/2 <span className="muted small-text">protectores</span>
          </div>
        </div>
        <p className="muted small-text" style={{ margin: '8px 0 0', flexBasis: '100%' }}>
          Ganas un protector cada 7 días de racha. Si un día no estudias, se gasta solo y tu racha sigue.
        </p>
      </section>

      <section className="card" aria-labelledby="time-title">
        <div className="row">
          <h2 id="time-title" className="grow" style={{ margin: 0 }}>
            Minutos de estudio
          </h2>
          <div className="segmented" role="tablist" aria-label="Periodo">
            <button role="tab" aria-selected={range === 'week'} onClick={() => setRange('week')}>
              Semana
            </button>
            <button role="tab" aria-selected={range === 'month'} onClick={() => setRange('month')}>
              Mes
            </button>
          </div>
        </div>
        <BarChart
          key={range}
          data={bars}
          goal={settings.dailyGoalMin || undefined}
          caption={range === 'week' ? 'Minutos de estudio de los últimos 7 días' : 'Minutos de estudio de los últimos 30 días'}
        />
        <p className="muted small-text" style={{ margin: 0 }}>
          Esta semana: <strong>{formatDuration(weekSec)}</strong>
        </p>
      </section>

      <section className="card" aria-labelledby="cal-title">
        <h2 id="cal-title">Calendario</h2>
        <Heatmap days={heat} today={today} />
      </section>

      <section aria-label="Totales" className="stats-grid two">
        <div className="stat">
          <span className="stat-value">{formatDuration(totalSec)}</span>
          <span className="stat-label">tiempo total</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lessons}</span>
          <span className="stat-label">lecciones</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalXp}</span>
          <span className="stat-label">XP</span>
        </div>
        <div className="stat">
          <span className="stat-value">{totalQ ? Math.round((100 * totalC) / totalQ) : 0} %</span>
          <span className="stat-label">de aciertos</span>
        </div>
      </section>

      <GoalPicker settings={settings} />

      <section className="card" aria-labelledby="skills-title">
        <h2 id="skills-title">Aciertos por tema</h2>
        {skillRows.length === 0 ? (
          <p className="muted">Aquí verás cómo vas en cada tema cuando hagas algunas lecciones.</p>
        ) : (
          <ul className="skill-list">
            {skillRows.map((s) => {
              const pct = Math.round((100 * s.correct) / s.attempts);
              return (
                <li key={s.skill}>
                  <div className="skill-row">
                    <span>{SKILL_LABEL[s.skill] ?? s.skill}</span>
                    <span className="muted small-text">
                      {pct} % · {s.attempts} preg.
                    </span>
                  </div>
                  <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={`${SKILL_LABEL[s.skill] ?? s.skill}: ${pct} % de aciertos`}>
                    <div style={{ width: `${pct}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="card" aria-labelledby="hard-title">
        <h2 id="hard-title">Palabras que más me cuestan</h2>
        {!hard || hard.length === 0 ? (
          <p className="muted">¡Todavía ninguna! Cuando falles alguna palabra aparecerá aquí para que la repases.</p>
        ) : (
          <ol className="hard-list">
            {hard.map(([word, n]) => (
              <li key={word}>
                <strong>{word}</strong>
                <span className="muted small-text">
                  {n} {n === 1 ? 'fallo' : 'fallos'}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </main>
  );
}

const GOALS: Settings['dailyGoalMin'][] = [0, 10, 15, 20, 30];

function GoalPicker({ settings }: { settings: Settings }) {
  return (
    <section className="card" aria-labelledby="goal-title">
      <h2 id="goal-title">Objetivo diario</h2>
      <div className="chips" role="radiogroup" aria-labelledby="goal-title">
        {GOALS.map((g) => (
          <button
            key={g}
            role="radio"
            aria-checked={settings.dailyGoalMin === g}
            className={`chip${settings.dailyGoalMin === g ? ' on' : ''}`}
            onClick={() => void updateSettings({ dailyGoalMin: g })}
          >
            {g === 0 ? 'Sin objetivo' : `${g} min`}
          </button>
        ))}
      </div>
    </section>
  );
}
