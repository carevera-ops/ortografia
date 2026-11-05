import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { decodeReport, summarize, type Report } from '../core/report/report';
import { BarChart, longDate, type BarDatum } from '../components/charts';
import { addDays, parseLocalDate } from '../core/time/dates';
import { SKILL_LABEL } from '../core/content/catalog';
import { routeToHash } from '../app/router';
import { Mascot } from '../components/Mascot';
import { formatDuration } from './Progress';

const WD = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];

/** Panel de solo lectura de un informe de seguimiento. */
export function ReportPanel({ r }: { r: Report }) {
  const s = summarize(r);
  const bars: BarDatum[] = r.d.map((x, i) => {
    const date = addDays(r.at, i - (r.d.length - 1));
    return { key: date, label: r.d.length > 10 ? String(parseLocalDate(date).getDate()) : WD[parseLocalDate(date).getDay()]!, title: longDate(date), value: x[0], highlight: i === r.d.length - 1 };
  });
  const skills = r.k.map(([k, a, c]) => ({ k, a, pct: Math.round((100 * c) / a) })).filter((x) => x.a >= 5);
  const ranked = [...skills].sort((a, b) => b.pct - a.pct);
  return (
    <>
      <section className="card highlight">
        <h2 style={{ marginBottom: 4 }}>{r.n ? `Progreso de ${r.n}` : 'Progreso en Tildín'}</h2>
        <p className="muted small-text" style={{ margin: 0 }}>
          Informe del {longDate(r.at)} · código {r.id}
        </p>
      </section>
      <section className="stats-grid two" aria-label="Resumen de la semana">
        <div className="stat">
          <span className="stat-value">{formatDuration(s.weekMin * 60)}</span>
          <span className="stat-label">esta semana</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.weekDays}/7</span>
          <span className="stat-label">días con estudio</span>
        </div>
        <div className="stat">
          <span className="stat-value">🔥 {r.s[0]}</span>
          <span className="stat-label">racha (récord {r.s[1]})</span>
        </div>
        <div className="stat">
          <span className="stat-value">{s.weekPct ?? '–'} %</span>
          <span className="stat-label">aciertos de la semana</span>
        </div>
      </section>
      <section className="card">
        <h2>Minutos de estudio (4 semanas)</h2>
        <BarChart data={bars} caption="Minutos de estudio de las últimas cuatro semanas" />
      </section>
      <section className="card">
        <h2>Totales</h2>
        <p style={{ margin: 0 }}>
          ⏱️ {formatDuration(r.t[0])} · 📘 {r.t[1]} lecciones · ⭐ {r.t[2]} XP · ✔ {s.totalPct ?? '–'} % de aciertos · 🏅 {r.b} insignias · 🗝️ {r.u} unidades superadas
        </p>
      </section>
      {ranked.length > 0 && (
        <section className="card">
          <h2>Aciertos por tema</h2>
          <ul className="skill-list">
            {ranked.map((x) => (
              <li key={x.k}>
                <div className="skill-row">
                  <span>{SKILL_LABEL[x.k] ?? x.k}</span>
                  <span className="muted small-text">
                    {x.pct} % · {x.a} preg.
                  </span>
                </div>
                <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={x.pct} aria-label={`${SKILL_LABEL[x.k] ?? x.k}: ${x.pct} %`}>
                  <div style={{ width: `${x.pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
      {r.w.length > 0 && (
        <section className="card">
          <h2>Palabras que más le cuestan</h2>
          <p style={{ margin: 0 }}>{r.w.join(' · ')}</p>
        </section>
      )}
    </>
  );
}

/** Pantalla al abrir un enlace o QR de seguimiento: ver y guardar el informe. */
export function ReportScreen({ code }: { code: string }) {
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    decodeReport(code).then(setReport, (e: Error) => setError(e.message));
  }, [code]);
  const existing = useLiveQuery(
    () => (report ? db.reports.where('childId').equals(report.id).filter((x) => x.at === report.at).count() : 0),
    [report?.id, report?.at],
  );
  return (
    <main className="screen" aria-labelledby="report-title">
      <div className="topbar">
        <h1 id="report-title">Informe de seguimiento</h1>
      </div>
      {error && (
        <div className="card center">
          <Mascot size={80} />
          <p>{error}</p>
          <p className="muted small-text">Pide que generen un código nuevo en la zona de padres de Tildín.</p>
        </div>
      )}
      {!report && !error && <p className="muted">Abriendo el informe…</p>}
      {report && (
        <>
          <ReportPanel r={report} />
          <div className="stack">
            {saved || (existing ?? 0) > 0 ? (
              <p className="card center" role="status">
                ✔ Guardado en este dispositivo.
              </p>
            ) : (
              <button
                className="btn block"
                onClick={async () => {
                  await db.reports.add({ childId: report.id, at: report.at, receivedAt: new Date().toISOString(), data: report });
                  setSaved(true);
                }}
              >
                💾 Guardar para ver la evolución
              </button>
            )}
            <a className="btn block ghost" href={routeToHash({ name: 'tracking' })}>
              Ver informes guardados
            </a>
          </div>
          <p className="muted small-text">
            Estos datos han llegado dentro del propio enlace: no se han enviado a ningún servidor. Si guardas el informe, se queda solo en este dispositivo.
          </p>
        </>
      )}
    </main>
  );
}

/** Informes guardados: evolución por niño. */
export function TrackingScreen() {
  const reports = useLiveQuery(() => db.reports.orderBy('at').toArray(), []);
  const [open, setOpen] = useState<number | null>(null);
  if (!reports) return <main className="screen" aria-busy="true" />;
  const byChild = new Map<string, typeof reports>();
  for (const r of reports) byChild.set(r.childId, [...(byChild.get(r.childId) ?? []), r]);

  return (
    <main className="screen" aria-labelledby="tracking-title">
      <div className="topbar">
        <a className="icon-btn" href={routeToHash({ name: 'home' })} aria-label="Volver al inicio">
          ‹
        </a>
        <h1 id="tracking-title">Seguimiento</h1>
      </div>
      {reports.length === 0 && (
        <div className="card">
          <p>Todavía no has guardado ningún informe.</p>
          <p className="muted small-text">
            En el iPhone del niño: Zona de padres → «Seguimiento desde otro dispositivo» → Generar código. Escanéalo con la cámara de este móvil o abre el enlace que te envíen, y pulsa «Guardar».
          </p>
        </div>
      )}
      {[...byChild.entries()].map(([childId, list]) => {
        const latest = list[list.length - 1]!;
        const evolution: BarDatum[] = list.map((x) => ({
          key: `${x.id}`,
          label: `${parseLocalDate(x.at).getDate()}/${parseLocalDate(x.at).getMonth() + 1}`,
          title: `semana hasta el ${longDate(x.at)}`,
          value: summarize(x.data).weekMin,
          highlight: x === latest,
        }));
        return (
          <section key={childId} className="card" aria-label={`Informes de ${latest.data.n ?? childId}`}>
            <h2>{latest.data.n ?? `Código ${childId}`}</h2>
            <p className="muted small-text" style={{ marginTop: 0 }}>
              {list.length} {list.length === 1 ? 'informe' : 'informes'} · último del {longDate(latest.at)}
            </p>
            {list.length > 1 && <BarChart data={evolution} caption="Minutos de estudio semanales en cada informe" />}
            <table className="report-table">
              <thead>
                <tr>
                  <th scope="col">Fecha</th>
                  <th scope="col">Semana</th>
                  <th scope="col">Aciertos</th>
                  <th scope="col">Racha</th>
                </tr>
              </thead>
              <tbody>
                {[...list].reverse().map((x) => {
                  const s = summarize(x.data);
                  return (
                    <tr key={x.id} onClick={() => setOpen(open === x.id ? null : x.id!)}>
                      <td>{`${parseLocalDate(x.at).getDate()}/${parseLocalDate(x.at).getMonth() + 1}/${parseLocalDate(x.at).getFullYear()}`}</td>
                      <td>{s.weekMin} min</td>
                      <td>{s.weekPct ?? '–'} %</td>
                      <td>🔥 {x.data.s[0]}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <button className="btn small ghost" onClick={() => setOpen(open === latest.id ? null : latest.id!)}>
              {open === latest.id ? 'Ocultar detalle' : 'Ver el último informe completo'}
            </button>
            {open !== null && list.some((x) => x.id === open) && (
              <div style={{ marginTop: 12 }}>
                <ReportPanel r={list.find((x) => x.id === open)!.data} />
                <button
                  className="btn small ko"
                  onClick={async () => {
                    await db.reports.delete(open);
                    setOpen(null);
                  }}
                >
                  Borrar este informe
                </button>
              </div>
            )}
          </section>
        );
      })}
    </main>
  );
}
