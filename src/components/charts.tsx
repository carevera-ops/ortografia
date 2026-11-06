import { useState } from 'react';
import { addDays, parseLocalDate, type LocalDate } from '../core/time/dates';

/**
 * Gráficas propias en SVG (sin librerías): barras de minutos por día y calendario de intensidad.
 * Una sola serie, un solo tono; texto con los colores de texto; ejes discretos; valor al tocar;
 * tabla oculta para VoiceOver.
 */

export interface BarDatum {
  key: string;
  label: string;
  /** Texto largo para el detalle y la tabla accesible. */
  title: string;
  value: number;
  highlight?: boolean;
}

export function BarChart({ data, goal, unit = 'min', caption }: { data: BarDatum[]; goal?: number; unit?: string; caption: string }) {
  const [sel, setSel] = useState<number | null>(null);
  const W = 320;
  const H = 150;
  const top = 18;
  const bottom = 22;
  const plotH = H - top - bottom;
  const max = Math.max(goal ?? 0, ...data.map((d) => d.value), 5);
  const slot = W / data.length;
  const barW = Math.max(3, Math.min(28, slot - 4)); // ≥ 2 px de separación por lado
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const labelEvery = data.length > 10 ? 5 : 1;
  const picked = sel !== null ? data[sel] : null;

  /** Barra con las esquinas superiores redondeadas (4 px) apoyada en la base. */
  const barPath = (x: number, v: number) => {
    const h = Math.max(0, (v / max) * plotH);
    if (h <= 0) return '';
    const r = Math.min(4, h, barW / 2);
    const yt = top + plotH - h;
    const yb = top + plotH;
    return `M${x},${yb} V${yt + r} Q${x},${yt} ${x + r},${yt} H${x + barW - r} Q${x + barW},${yt} ${x + barW},${yt + r} V${yb} Z`;
  };

  return (
    <figure className="chart">
      <div className="chart-detail" aria-live="polite">
        {picked ? (
          <>
            <strong>
              {picked.value} {unit}
            </strong>{' '}
            <span className="muted">· {picked.title}</span>
          </>
        ) : (
          <span className="muted">Toca una barra para ver el detalle</span>
        )}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={caption}>
        {/* Línea base y objetivo (discretos) */}
        <line x1="0" x2={W} y1={top + plotH} y2={top + plotH} stroke="var(--border)" strokeWidth="1" />
        {goal ? (
          <g>
            <line x1="0" x2={W} y1={y(goal)} y2={y(goal)} stroke="var(--text-soft)" strokeWidth="1" strokeDasharray="4 4" />
            <text x={W} y={y(goal) - 4} textAnchor="end" fontSize="10" fill="var(--text-soft)">
              objetivo {goal} {unit}
            </text>
          </g>
        ) : null}
        <text x="0" y="10" fontSize="10" fill="var(--text-soft)">
          {max} {unit}
        </text>
        {data.map((d, i) => {
          const x = i * slot + (slot - barW) / 2;
          const active = sel === i;
          return (
            <g key={d.key}>
              <path d={barPath(x, d.value)} fill={d.highlight ? 'var(--primary)' : 'var(--primary-soft)'} opacity={sel === null || active ? 1 : 0.55} />
              {/* Zona de toque más grande que la barra */}
              <rect
                x={i * slot}
                y={top}
                width={slot}
                height={plotH + bottom}
                fill="transparent"
                onClick={() => setSel(active ? null : i)}
                onPointerEnter={(e) => e.pointerType === 'mouse' && setSel(i)}
              />
              {i % labelEvery === 0 || data.length <= 10 ? (
                <text x={i * slot + slot / 2} y={H - 6} textAnchor="middle" fontSize="10" fill={active ? 'var(--text)' : 'var(--text-soft)'} fontWeight={active ? 700 : 400}>
                  {d.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <table className="sr-only">
        <caption>{caption}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.key}>
              <th scope="row">{d.title}</th>
              <td>
                {d.value} {unit}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

export interface HeatDay {
  minutes: number;
  lessons: number;
  streak: boolean;
  freeze: boolean;
  champion: boolean;
}

const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const WEEKDAY_LONG = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** Intensidad (0–4) según los minutos estudiados. */
export function heatLevel(min: number): number {
  if (min <= 0) return 0;
  if (min < 5) return 1;
  if (min < 15) return 2;
  if (min < 30) return 3;
  return 4;
}

export function longDate(d: LocalDate): string {
  const dt = parseLocalDate(d);
  return `${WEEKDAY_LONG[dt.getDay()]} ${dt.getDate()} de ${MONTHS[dt.getMonth()]}`;
}

/** Calendario mensual tipo "heatmap": intensidad de estudio, días de racha y protectores. */
export function Heatmap({ days, today }: { days: Map<LocalDate, HeatDay>; today: LocalDate }) {
  const t = parseLocalDate(today);
  const [ym, setYm] = useState({ y: t.getFullYear(), m: t.getMonth() });
  const [sel, setSel] = useState<LocalDate | null>(null);
  const first = `${ym.y}-${String(ym.m + 1).padStart(2, '0')}-01`;
  const offset = (parseLocalDate(first).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (LocalDate | null)[] = [...Array(offset).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => addDays(first, i))];
  const move = (delta: number) => {
    const d = new Date(ym.y, ym.m + delta, 1);
    setYm({ y: d.getFullYear(), m: d.getMonth() });
    setSel(null);
  };
  const isCurrent = ym.y === t.getFullYear() && ym.m === t.getMonth();
  const info = sel ? days.get(sel) : null;

  return (
    <div className="heatmap">
      <div className="heatmap-head">
        <button className="icon-btn" onClick={() => move(-1)} aria-label="Mes anterior">
          ‹
        </button>
        <strong>
          {MONTHS[ym.m]} {ym.y}
        </strong>
        <button className="icon-btn" onClick={() => move(1)} disabled={isCurrent} aria-label="Mes siguiente">
          ›
        </button>
      </div>
      <div className="heat-grid" role="group" aria-label={`Calendario de estudio de ${MONTHS[ym.m]}`}>
        {WEEKDAYS.map((w) => (
          <div key={w} className="heat-weekday" aria-hidden="true">
            {w}
          </div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} />;
          const h = days.get(d);
          const lvl = heatLevel(h?.minutes ?? 0);
          const future = d > today;
          const label = `${longDate(d)}: ${h?.minutes ?? 0} minutos${h?.streak ? ', día de racha' : ''}${h?.freeze ? ', protector usado' : ''}${h?.champion ? ', día de campeón' : ''}`;
          return (
            <button
              key={d}
              className={`heat-cell lvl-${lvl}${h?.streak ? ' streak' : ''}${d === today ? ' today' : ''}${sel === d ? ' selected' : ''}`}
              disabled={future}
              aria-label={label}
              onClick={() => setSel(sel === d ? null : d)}
            >
              <span className="heat-num">{parseLocalDate(d).getDate()}</span>
              {h?.freeze && (
                <span className="heat-icon" aria-hidden="true">
                  🧊
                </span>
              )}
              {h?.champion && (
                <span className="heat-icon" aria-hidden="true">
                  🏆
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="chart-detail" aria-live="polite">
        {sel ? (
          <>
            <strong>{longDate(sel)}</strong>
            <span className="muted">
              {' '}
              · {info?.minutes ?? 0} min · {info?.lessons ?? 0} {info?.lessons === 1 ? 'lección' : 'lecciones'}
              {info?.streak ? ' · 🔥 racha' : ''}
              {info?.freeze ? ' · 🧊 protector' : ''}
              {info?.champion ? ' · 🏆 campeón' : ''}
            </span>
          </>
        ) : (
          <span className="muted">Toca un día para ver el detalle</span>
        )}
      </div>
      <div className="heat-legend" aria-hidden="true">
        <span>Menos</span>
        {[0, 1, 2, 3, 4].map((l) => (
          <span key={l} className={`heat-swatch lvl-${l}`} />
        ))}
        <span>Más</span>
        <span className="heat-swatch streak-swatch" /> racha
        <span>🧊 protector</span>
        <span>🏆 campeón</span>
      </div>
    </div>
  );
}
