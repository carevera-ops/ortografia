import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, updateSettings } from '../db/db';
import { usePath, useSettings, useStreak } from '../hooks';
import { buildReport, encodeReport, newChildId, reportUrl } from '../core/report/report';
import { computeStreak } from '../core/streak/streak';
import { QrCode } from '../components/QrCode';
import { checkPin, hashPin, isValidPin, newSalt } from '../core/parents/pin';
import { backupDue, describeBackup, exportBackup, importBackup, parseBackup, resetProgress, shareOrDownload, type Backup } from '../db/backup';
import { addDays } from '../core/time/dates';
import { SKILL_LABEL } from '../core/content/catalog';
import { routeToHash } from '../app/router';
import { formatDuration } from './Progress';
import type { Settings } from '../db/types';

/** Teclado numérico grande para el PIN. */
function PinPad({ title, subtitle, error, onComplete }: { title: string; subtitle?: string; error?: string | null; onComplete: (pin: string) => void }) {
  const [pin, setPin] = useState('');
  const press = (d: string) => {
    const p = pin + d;
    // Al cuarto dígito se procesa al momento (así no se pierden pulsaciones rápidas).
    if (p.length === 4) {
      setPin('');
      onComplete(p);
    } else setPin(p);
  };
  return (
    <div className="pinpad">
      <h2>{title}</h2>
      {subtitle && <p className="muted">{subtitle}</p>}
      <div className="pin-dots" aria-label={`${pin.length} de 4 dígitos`} role="status">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={i < pin.length ? 'on' : ''} />
        ))}
      </div>
      {error && (
        <p className="pin-error anim-shake" role="alert">
          {error}
        </p>
      )}
      <div className="pin-keys">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
          <button key={d} className="pin-key" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <span />
        <button className="pin-key" onClick={() => press('0')}>
          0
        </button>
        <button className="pin-key small" aria-label="Borrar" onClick={() => setPin(pin.slice(0, -1))}>
          ⌫
        </button>
      </div>
    </div>
  );
}

/** Acceso: crear el PIN la primera vez o pedirlo. */
function Gate({ settings, onUnlock }: { settings: Settings; onUnlock: () => void }) {
  const [first, setFirst] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fails, setFails] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [forgot, setForgot] = useState(false);
  const [phrase, setPhrase] = useState('');

  if (!settings.pinHash) {
    return (
      <PinPad
        title={first ? 'Repite el PIN' : 'Crea un PIN de padres'}
        subtitle={first ? 'Escribe otra vez los mismos 4 números.' : 'Con él se entra en los ajustes y la copia de seguridad. Elige 4 números que el niño no conozca.'}
        error={error}
        onComplete={async (p) => {
          if (!first) {
            setFirst(p);
            setError(null);
            return;
          }
          if (p !== first) {
            setFirst(null);
            setError('No coinciden. Vuelve a empezar.');
            return;
          }
          const salt = newSalt();
          await updateSettings({ pinSalt: salt, pinHash: await hashPin(p, salt) });
          onUnlock();
        }}
      />
    );
  }

  if (forgot) {
    return (
      <div className="card">
        <h2>¿Has olvidado el PIN?</h2>
        <p className="muted">
          Para quitar el PIN (sin borrar el progreso), escribe exactamente: <strong>SOY UN ADULTO</strong>
        </p>
        <input className="text-input" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Frase de confirmación" />
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn ghost small" onClick={() => setForgot(false)}>
            Volver
          </button>
          <button
            className="btn small grow"
            disabled={phrase.trim().toUpperCase() !== 'SOY UN ADULTO'}
            onClick={async () => {
              await updateSettings({ pinHash: null, pinSalt: null });
              setForgot(false);
            }}
          >
            Quitar el PIN
          </button>
        </div>
      </div>
    );
  }

  const blocked = Date.now() < blockedUntil;
  return (
    <>
      <PinPad
        title="Zona de padres"
        subtitle="Escribe el PIN de 4 números."
        error={blocked ? 'Demasiados intentos. Espera 30 segundos.' : error}
        onComplete={async (p) => {
          if (Date.now() < blockedUntil) return;
          if (await checkPin(p, settings.pinSalt, settings.pinHash)) {
            setFails(0);
            onUnlock();
          } else {
            const f = fails + 1;
            setFails(f);
            setError('PIN incorrecto.');
            if (f >= 5) {
              setBlockedUntil(Date.now() + 30_000);
              setFails(0);
            }
          }
        }}
      />
      <button className="btn ghost small block" onClick={() => setForgot(true)}>
        He olvidado el PIN
      </button>
    </>
  );
}

function Chips<T extends string | number>({ value, options, onChange, label }: { value: T; options: [T, string][]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="chips" role="radiogroup" aria-label={label}>
      {options.map(([v, text]) => (
        <button key={String(v)} role="radio" aria-checked={value === v} className={`chip${value === v ? ' on' : ''}`} onClick={() => onChange(v)}>
          {text}
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="toggle">
      <span>{label}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true" />
    </label>
  );
}

/** Resumen de los últimos 7 días para los padres. */
function WeeklySummary() {
  const streak = useStreak();
  const days = useLiveQuery(() => db.dailyStats.toArray(), []);
  const skills = useLiveQuery(() => db.skillMastery.toArray(), []);
  if (!days || !streak || !skills) return null;
  const from = addDays(streak.today, -6);
  const week = days.filter((d) => d.date >= from && d.date <= streak.today);
  const sec = week.reduce((a, d) => a + d.activeSec, 0);
  const q = week.reduce((a, d) => a + d.questions, 0);
  const c = week.reduce((a, d) => a + d.correct, 0);
  const lessons = week.reduce((a, d) => a + d.lessons, 0);
  const studied = week.filter((d) => d.questions > 0).length;
  const ranked = skills
    .filter((s) => s.attempts >= 10)
    .map((s) => ({ ...s, pct: Math.round((100 * s.correct) / s.attempts) }))
    .sort((a, b) => b.pct - a.pct);
  const strong = ranked.slice(0, 3);
  const weak = ranked.slice(-3).reverse().filter((s) => !strong.includes(s));
  return (
    <section className="card" aria-labelledby="week-title">
      <h2 id="week-title">Resumen de la semana</h2>
      <div className="stats-grid two" style={{ margin: '0 0 12px' }}>
        <div className="stat">
          <span className="stat-value">{formatDuration(sec)}</span>
          <span className="stat-label">de estudio</span>
        </div>
        <div className="stat">
          <span className="stat-value">{studied}/7</span>
          <span className="stat-label">días con estudio</span>
        </div>
        <div className="stat">
          <span className="stat-value">{lessons}</span>
          <span className="stat-label">lecciones</span>
        </div>
        <div className="stat">
          <span className="stat-value">{q ? Math.round((100 * c) / q) : 0} %</span>
          <span className="stat-label">de aciertos</span>
        </div>
      </div>
      <p style={{ margin: '0 0 8px' }}>
        🔥 Racha actual: <strong>{streak.current}</strong> días · récord {streak.best} · 🧊 {streak.freezes}
      </p>
      {ranked.length === 0 ? (
        <p className="muted small-text">Todavía no hay datos suficientes por tema (hacen falta al menos 10 respuestas).</p>
      ) : (
        <div className="two-cols">
          <div>
            <h3 className="small-heading">💪 Puntos fuertes</h3>
            <ul className="plain-list">
              {strong.map((s) => (
                <li key={s.skill}>
                  {SKILL_LABEL[s.skill] ?? s.skill} <span className="muted">{s.pct} %</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="small-heading">🎯 Para reforzar</h3>
            <ul className="plain-list">
              {weak.map((s) => (
                <li key={s.skill}>
                  {SKILL_LABEL[s.skill] ?? s.skill} <span className="muted">{s.pct} %</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      <a className="small-text" href={routeToHash({ name: 'progress' })}>
        Ver todo el progreso →
      </a>
    </section>
  );
}

function BackupPanel({ settings, studiedDays }: { settings: Settings; studiedDays: number }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, setPending] = useState<Backup | null>(null);
  const due = backupDue(settings.lastBackupAt, studiedDays);

  const doExport = async () => {
    const b = await exportBackup();
    const r = await shareOrDownload(b);
    if (r !== 'cancelled') {
      await updateSettings({ lastBackupAt: new Date().toISOString() });
      setMsg(r === 'shared' ? '✔ Copia compartida. Guárdala en Archivos o envíatela.' : '✔ Copia descargada.');
    }
  };
  const onFile = async (f: File | undefined) => {
    if (!f) return;
    try {
      setPending(parseBackup(await f.text()));
      setMsg(null);
    } catch (e) {
      setMsg(`✘ ${(e as Error).message}`);
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const info = pending ? describeBackup(pending) : null;

  return (
    <section className="card" aria-labelledby="backup-title">
      <h2 id="backup-title">Copia de seguridad</h2>
      {due && (
        <p className="warning" role="status">
          ⚠️ {settings.lastBackupAt ? 'Hace más de dos semanas de la última copia.' : 'Todavía no has hecho ninguna copia.'} ¡Haz una ahora!
        </p>
      )}
      <p className="muted small-text">
        Todo el progreso se guarda solo en este iPhone, dentro de la app instalada. <strong>Si borras el icono de la pantalla de inicio, se borra el progreso.</strong> Haz una copia de vez en cuando y guárdala en Archivos, iCloud o envíatela.
      </p>
      <p className="small-text">Última copia: {settings.lastBackupAt ? new Date(settings.lastBackupAt).toLocaleString('es-ES') : 'nunca'}</p>
      <div className="stack">
        <button className="btn block secondary" onClick={() => void doExport()}>
          📤 Exportar copia
        </button>
        <button className="btn block ghost" onClick={() => fileRef.current?.click()}>
          📥 Restaurar una copia
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
      </div>
      {msg && (
        <p className="small-text" role="status">
          {msg}
        </p>
      )}
      {pending && info && (
        <div className="sheet-backdrop" onClick={() => setPending(null)}>
          <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="restore-title" onClick={(e) => e.stopPropagation()}>
            <h2 id="restore-title">¿Restaurar esta copia?</h2>
            <p>
              Copia del <strong>{new Date(info.exportedAt).toLocaleString('es-ES')}</strong>: {info.days} días de estudio, {info.lessons} lecciones y {info.xp} XP.
            </p>
            <p className="warning">El progreso actual de este iPhone se sustituirá por el de la copia.</p>
            <div className="stack">
              <button
                className="btn block"
                onClick={async () => {
                  await importBackup(pending);
                  setPending(null);
                  setMsg('✔ Copia restaurada.');
                }}
              >
                Restaurar
              </button>
              <button className="btn block ghost" onClick={() => setPending(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ResetPanel() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [done, setDone] = useState(false);
  return (
    <section className="card danger-zone" aria-labelledby="reset-title">
      <h2 id="reset-title">Reiniciar el progreso</h2>
      <p className="muted small-text">Borra racha, lecciones, tiempos, insignias y estadísticas. Los ajustes y el PIN se mantienen. Haz antes una copia de seguridad.</p>
      {done && <p role="status">✔ Progreso borrado.</p>}
      {!open ? (
        <button className="btn ko small" onClick={() => setOpen(true)}>
          Reiniciar progreso…
        </button>
      ) : (
        <>
          <p className="small-text">
            Para confirmar, escribe <strong>BORRAR</strong>:
          </p>
          <input className="text-input" value={text} onChange={(e) => setText(e.target.value)} autoCapitalize="characters" autoCorrect="off" autoComplete="off" spellCheck={false} aria-label="Escribe BORRAR para confirmar" />
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn ghost small" onClick={() => setOpen(false)}>
              Cancelar
            </button>
            <button
              className="btn ko small grow"
              disabled={text.trim().toUpperCase() !== 'BORRAR'}
              onClick={async () => {
                await resetProgress();
                setOpen(false);
                setText('');
                setDone(true);
              }}
            >
              Borrar todo el progreso
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function ChangePin() {
  const [open, setOpen] = useState(false);
  const [first, setFirst] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  if (!open)
    return (
      <button className="btn ghost small" onClick={() => setOpen(true)}>
        Cambiar el PIN
      </button>
    );
  return (
    <PinPad
      title={first ? 'Repite el nuevo PIN' : 'Nuevo PIN'}
      error={msg}
      onComplete={async (p) => {
        if (!isValidPin(p)) return;
        if (!first) return setFirst(p);
        if (p !== first) {
          setFirst(null);
          return setMsg('No coinciden. Vuelve a empezar.');
        }
        const salt = newSalt();
        await updateSettings({ pinSalt: salt, pinHash: await hashPin(p, salt) });
        setOpen(false);
        setFirst(null);
        setMsg(null);
      }}
    />
  );
}

/** Genera el código QR / enlace de seguimiento para verlo en otro dispositivo. */
function TrackingPanel({ settings }: { settings: Settings }) {
  const streak = useStreak();
  const path = usePath();
  const [url, setUrl] = useState<string | null>(null);
  const [alias, setAlias] = useState(settings.childAlias ?? '');
  const [msg, setMsg] = useState<string | null>(null);

  const generate = async () => {
    if (!streak || !path) return;
    let childId = settings.childId;
    if (!childId) {
      childId = newChildId();
      await updateSettings({ childId });
    }
    const clean = alias.trim().slice(0, 30) || null;
    if (clean !== settings.childAlias) await updateSettings({ childAlias: clean });
    const [days, skills, wrong, achievements] = await Promise.all([
      db.dailyStats.toArray(),
      db.skillMastery.toArray(),
      db.attempts.filter((a) => !a.correct).toArray(),
      db.achievements.toArray(),
    ]);
    const count = new Map<string, number>();
    for (const a of wrong) count.set(a.target, (count.get(a.target) ?? 0) + 1);
    const hardWords = [...count.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
    // La racha se recalcula con los datos recién leídos (no con los de la pantalla).
    const fresh = computeStreak(days, streak.today, { criterion: settings.streakCriterion, minutes: settings.streakMinutes });
    const report = buildReport({
      childId,
      alias: clean,
      today: streak.today,
      streak: fresh,
      days,
      skills,
      hardWords,
      achievements,
      unitsMastered: Object.values(path.unitMastered).filter(Boolean).length,
    });
    setUrl(reportUrl(location.origin, import.meta.env.BASE_URL, await encodeReport(report)));
    setMsg(null);
  };

  const share = async () => {
    if (!url) return;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Progreso en Tildín', text: 'Informe de progreso de Tildín', url });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setMsg('✔ Enlace copiado.');
    } catch {
      setMsg('No se ha podido copiar. Mantén pulsado el enlace para copiarlo.');
    }
  };

  return (
    <section className="card" aria-labelledby="tracking-title">
      <h2 id="tracking-title">Seguimiento desde otro dispositivo</h2>
      <p className="muted small-text">
        Genera un código con el progreso de hoy y ábrelo en tu móvil (con la cámara o enviándote el enlace). Los datos van dentro del propio código: no pasan por ningún servidor. Si guardas los informes en tu móvil, podrás ver la evolución semana a semana.
      </p>
      <label className="small-heading" htmlFor="alias">
        Nombre que aparecerá en el informe (opcional)
      </label>
      <input id="alias" className="text-input" value={alias} maxLength={30} onChange={(e) => setAlias(e.target.value)} placeholder="Por ejemplo, un apodo" autoComplete="off" autoCorrect="off" />
      <button className="btn block secondary" style={{ marginTop: 12 }} onClick={() => void generate()}>
        📲 Generar código de seguimiento
      </button>
      {url && (
        <div className="center" style={{ marginTop: 14 }}>
          <QrCode text={url} label="Código QR con el informe de seguimiento" />
          <p className="small-text muted">Escanéalo con la cámara de otro móvil o comparte el enlace.</p>
          <button className="btn block ghost" onClick={() => void share()}>
            🔗 Compartir enlace
          </button>
          {msg && (
            <p className="small-text" role="status">
              {msg}
            </p>
          )}
          <p className="small-text muted" style={{ wordBreak: 'break-all' }}>
            Código del niño: <strong>{settings.childId}</strong> ·{' '}
            <a href={url} className="report-link">
              Ver el informe en este dispositivo
            </a>
          </p>
        </div>
      )}
      <a className="small-text" href={routeToHash({ name: 'tracking' })}>
        Ver informes recibidos en este dispositivo →
      </a>
    </section>
  );
}

/** Zona de padres: resumen, ajustes, contenido, copia de seguridad y recordatorios. */
export function Parents() {
  const settings = useSettings();
  const [unlocked, setUnlocked] = useState(false);
  const studiedDays = useLiveQuery(() => db.dailyStats.filter((d) => d.questions > 0).count(), []) ?? 0;

  if (!unlocked) {
    return (
      <main className="screen with-tabbar" aria-labelledby="parents-title">
        <div className="topbar">
          <a className="icon-btn" href={routeToHash({ name: 'home' })} aria-label="Volver al inicio">
            ‹
          </a>
          <h1 id="parents-title">Zona de padres</h1>
        </div>
        <Gate settings={settings} onUnlock={() => setUnlocked(true)} />
      </main>
    );
  }

  return (
    <main className="screen with-tabbar" aria-labelledby="parents-title">
      <div className="topbar">
        <h1 id="parents-title">Zona de padres</h1>
        <button className="btn small ghost" onClick={() => setUnlocked(false)}>
          🔒 Cerrar
        </button>
      </div>

      <WeeklySummary />

      <section className="card" aria-labelledby="settings-title">
        <h2 id="settings-title">Ajustes</h2>
        <h3 className="small-heading">¿Qué cuenta como día de racha?</h3>
        <Chips
          label="Criterio de racha"
          value={settings.streakCriterion}
          onChange={(v) => void updateSettings({ streakCriterion: v })}
          options={[
            ['either', `Una lección o ${settings.streakMinutes} min`],
            ['lesson', 'Una lección'],
            ['minutes', `${settings.streakMinutes} min de estudio`],
          ]}
        />
        {settings.streakCriterion !== 'lesson' && (
          <>
            <h3 className="small-heading">Minutos mínimos</h3>
            <Chips label="Minutos para la racha" value={settings.streakMinutes} onChange={(v) => void updateSettings({ streakMinutes: v })} options={[[5, '5 min'], [10, '10 min'], [15, '15 min']]} />
          </>
        )}
        <h3 className="small-heading">Objetivo diario</h3>
        <Chips
          label="Objetivo diario"
          value={settings.dailyGoalMin}
          onChange={(v) => void updateSettings({ dailyGoalMin: v })}
          options={[[0, 'Sin objetivo'], [10, '10 min'], [15, '15 min'], [20, '20 min'], [30, '30 min']]}
        />
        <h3 className="small-heading">Apariencia</h3>
        <Chips label="Tema" value={settings.theme} onChange={(v) => void updateSettings({ theme: v })} options={[['auto', 'Automático'], ['light', 'Claro'], ['dark', 'Oscuro']]} />
        <Toggle label="🔊 Sonidos de acierto y error" checked={settings.sound} onChange={(v) => void updateSettings({ sound: v })} />
      </section>

      <section className="card" aria-labelledby="content-title">
        <h2 id="content-title">Contenido</h2>
        <Toggle label="🔓 Desbloquear todas las unidades" checked={settings.unlockAll} onChange={(v) => void updateSettings({ unlockAll: v })} />
        <p className="muted small-text">
          Abre todas las unidades y niveles del camino para practicar lo que se quiera (por ejemplo, lo que se esté dando en clase). El progreso se sigue guardando igual; si se desactiva, el camino vuelve a abrirse por orden.
        </p>
      </section>

      <TrackingPanel settings={settings} />

      <BackupPanel settings={settings} studiedDays={studiedDays} />

      <section className="card" aria-labelledby="reminder-title">
        <h2 id="reminder-title">Recordatorio diario (app Atajos)</h2>
        <p className="muted small-text">Una web app no puede enviar notificaciones por sí sola. Con la app Atajos del iPhone se puede crear un aviso diario:</p>
        <ol className="steps">
          <li>
            Abre <strong>Atajos</strong> → pestaña <strong>Automatización</strong> → <strong>+</strong> (Nueva automatización).
          </li>
          <li>
            Elige <strong>Hora del día</strong>, pon la hora (por ejemplo, 18:00) y <strong>Diariamente</strong>.
          </li>
          <li>
            Marca <strong>Ejecutar inmediatamente</strong> y pulsa <strong>Siguiente</strong>.
          </li>
          <li>
            Añade la acción <strong>Mostrar notificación</strong> con un texto como «¡Hora de practicar con Tildín! 🔥». También puedes añadir <strong>Abrir app</strong> y elegir Tildín.
          </li>
          <li>Pulsa OK. ¡Listo!</li>
        </ol>
      </section>

      <section className="card" aria-labelledby="pin-title">
        <h2 id="pin-title">PIN</h2>
        <ChangePin />
      </section>

      <ResetPanel />

      <section className="card" aria-labelledby="privacy-title">
        <h2 id="privacy-title">Privacidad</h2>
        <p className="muted small-text">
          Tildín no tiene cuentas, anuncios ni analítica, y no envía datos a ningún sitio: todo se queda en este iPhone. Los datos de la app instalada son independientes de los de Safari.
        </p>
      </section>
    </main>
  );
}
