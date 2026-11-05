import { Mascot } from '../components/Mascot';
import { navigate } from '../app/router';
import { skipInstall } from '../app/platform';

/** Ilustración 1: barra inferior de Safari con el botón Compartir resaltado. */
function StepShare() {
  return (
    <svg viewBox="0 0 240 110" width="100%" role="img" aria-label="Barra de Safari con el botón Compartir resaltado">
      <rect x="4" y="4" width="232" height="102" rx="16" fill="var(--surface-2)" />
      <rect x="20" y="16" width="200" height="30" rx="10" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
      <text x="120" y="36" textAnchor="middle" fontSize="12" fill="var(--text-soft)">
        usuario.github.io
      </text>
      {/* Iconos de la barra: atrás, adelante, compartir, libro, pestañas */}
      <g fill="none" stroke="var(--text-soft)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M32 78 l-8 -8 l8 -8" />
        <path d="M70 62 l8 8 l-8 8" />
        <rect x="160" y="62" width="16" height="16" rx="2" />
        <rect x="200" y="62" width="14" height="14" rx="2" />
      </g>
      <circle cx="120" cy="72" r="20" fill="none" stroke="var(--primary)" strokeWidth="3" className="anim-bob" />
      <g fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M112 70 v12 h16 v-12" />
        <path d="M120 76 v-18 M114 64 l6 -6 l6 6" />
      </g>
    </svg>
  );
}

/** Ilustración 2: menú de compartir con "Añadir a pantalla de inicio". */
function StepAdd() {
  return (
    <svg viewBox="0 0 240 120" width="100%" role="img" aria-label="Opción Añadir a pantalla de inicio">
      <rect x="4" y="4" width="232" height="112" rx="16" fill="var(--surface-2)" />
      <rect x="16" y="14" width="208" height="28" rx="8" fill="var(--surface)" />
      <text x="28" y="33" fontSize="12" fill="var(--text-soft)">
        Copiar
      </text>
      <rect x="16" y="46" width="208" height="32" rx="8" fill="var(--surface)" stroke="var(--primary)" strokeWidth="3" />
      <text x="28" y="67" fontSize="13" fontWeight="700" fill="var(--text)">
        Añadir a pantalla de inicio
      </text>
      <g fill="none" stroke="var(--text)" strokeWidth="2.5" strokeLinecap="round">
        <rect x="196" y="53" width="18" height="18" rx="4" />
        <path d="M205 57 v10 M200 62 h10" />
      </g>
      <rect x="16" y="82" width="208" height="28" rx="8" fill="var(--surface)" />
      <text x="28" y="101" fontSize="12" fill="var(--text-soft)">
        Añadir a favoritos
      </text>
    </svg>
  );
}

/** Ilustración 3: el icono de Tildín en la pantalla de inicio. */
function StepOpen() {
  return (
    <svg viewBox="0 0 240 110" width="100%" role="img" aria-label="Icono de Tildín en la pantalla de inicio">
      <rect x="4" y="4" width="232" height="102" rx="16" fill="var(--accent)" opacity="0.85" />
      {[30, 80, 160, 210].map((x) => (
        <rect key={x} x={x - 20} y="22" width="40" height="40" rx="10" fill="#fff" opacity="0.35" />
      ))}
      <rect x="100" y="18" width="48" height="48" rx="12" fill="#ff7a3d" stroke="#fff" strokeWidth="3" />
      <ellipse cx="124" cy="46" rx="15" ry="14" fill="#ffd25e" />
      <circle cx="119" cy="44" r="2.5" fill="#2b2240" />
      <circle cx="129" cy="44" r="2.5" fill="#2b2240" />
      <path d="M125 28 l7 -4" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <text x="124" y="84" textAnchor="middle" fontSize="12" fontWeight="700" fill="#fff">
        Tildín
      </text>
    </svg>
  );
}

export function InstallHelp() {
  return (
    <main className="screen" aria-labelledby="install-title">
      <div className="center" style={{ marginTop: 8 }}>
        <Mascot size={88} bob />
        <h1 id="install-title">¡Instala Tildín en tu iPhone!</h1>
        <p className="muted">Así se abre a pantalla completa, funciona sin internet y guarda tu progreso.</p>
      </div>

      <ol className="stack" style={{ listStyle: 'none', padding: 0, margin: '8px 0 16px' }}>
        <li className="card">
          <h2>1. Toca el botón Compartir</h2>
          <p className="muted">Es el cuadrado con una flecha hacia arriba, abajo en Safari.</p>
          <StepShare />
        </li>
        <li className="card">
          <h2>2. Elige «Añadir a pantalla de inicio»</h2>
          <p className="muted">Si no lo ves, desliza el menú hacia arriba. Después toca «Añadir».</p>
          <StepAdd />
        </li>
        <li className="card">
          <h2>3. Abre Tildín desde su icono</h2>
          <p className="muted">
            Usa <strong>siempre el icono</strong>: el progreso se guarda en la app instalada, no en Safari.
          </p>
          <StepOpen />
        </li>
      </ol>

      <button
        className="btn ghost block"
        onClick={() => {
          skipInstall();
          navigate({ name: 'home' }, true);
        }}
      >
        Probar en Safari de todas formas
      </button>
      <p className="muted center" style={{ fontSize: '0.85rem' }}>
        Lo que hagas en Safari no pasará a la app instalada.
      </p>
    </main>
  );
}
