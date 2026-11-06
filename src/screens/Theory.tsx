import { useEffect, useState } from 'react';
import { loadRules } from '../core/content/loader';
import type { Rule } from '../core/content/schema';
import { routeToHash } from '../app/router';
import { RuleCard } from './Lesson';

/** Teoría: listado de fichas y ficha detallada. */
export function Theory({ ruleId }: { ruleId?: string }) {
  const [rules, setRules] = useState<Map<string, Rule> | null>(null);
  useEffect(() => {
    void loadRules().then(setRules);
  }, []);
  const rule = ruleId ? rules?.get(ruleId) : undefined;

  return (
    <main className="screen with-tabbar" aria-labelledby="theory-title">
      <div className="topbar">
        {ruleId && (
          <a className="icon-btn" href={routeToHash({ name: 'theory' })} aria-label="Volver a la teoría">
            ‹
          </a>
        )}
        <h1 id="theory-title">Teoría</h1>
      </div>
      {!rules ? (
        <p className="muted">Cargando…</p>
      ) : rule ? (
        <div className="card">
          <RuleCard rule={rule} />
        </div>
      ) : (
        <ul className="stack" style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {[...rules.values()].map((r) => (
            <li key={r.id}>
              <a className="card rule-link" href={routeToHash({ name: 'theory', ruleId: r.id })}>
                <strong>{r.titulo}</strong>
                <span className="muted small-text">{r.resumen}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      {!ruleId && (
        <a className="card rule-link" href={routeToHash({ name: 'about' })} style={{ marginTop: 14 }}>
          <strong>ℹ️ Acerca de Tildín</strong>
          <span className="muted small-text">Autoría, licencia y créditos</span>
        </a>
      )}
    </main>
  );
}
