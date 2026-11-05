/** Anillo de progreso del objetivo diario (minutos de estudio). */
export function GoalRing({ minutes, goal, size = 92 }: { minutes: number; goal: number; size?: number }) {
  const r = (size - 12) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(1, goal ? minutes / goal : 0);
  const done = pct >= 1;
  return (
    <div className="goal-ring" style={{ width: size, height: size }} role="img" aria-label={`Objetivo diario: ${minutes} de ${goal} minutos`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--locked)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={done ? 'var(--ok)' : 'var(--primary)'}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * pct} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <div className="goal-ring-label" aria-hidden="true">
        {done ? (
          <span style={{ fontSize: '1.6rem' }}>✔</span>
        ) : (
          <>
            <strong>{minutes}</strong>
            <span>/{goal} min</span>
          </>
        )}
      </div>
    </div>
  );
}
