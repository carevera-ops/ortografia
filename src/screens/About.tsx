import { Mascot } from '../components/Mascot';
import { routeToHash } from '../app/router';

/** Acerca de Tildín: autoría, licencia, fuentes y software de terceros. */
export function About() {
  return (
    <main className="screen with-tabbar" aria-labelledby="about-title">
      <div className="topbar">
        <a className="icon-btn" href={routeToHash({ name: 'theory' })} aria-label="Volver a la teoría">
          ‹
        </a>
        <h1 id="about-title">Acerca de Tildín</h1>
      </div>
      <section className="card center">
        <Mascot size={88} />
        <h2>Tildín · Ortografía y acentuación</h2>
        <p className="muted">Versión {__APP_VERSION__}</p>
        <p>
          © 2026 <strong>Carlos Arellano</strong>
        </p>
      </section>
      <section className="card">
        <h2>Autoría</h2>
        <p>Idea, diseño, dirección y revisión: Carlos Arellano.</p>
        <p className="muted small-text">Desarrollado con la ayuda de Claude (Anthropic), un asistente de inteligencia artificial.</p>
      </section>
      <section className="card">
        <h2>Licencia</h2>
        <p>
          Tildín se publica con la licencia <strong>Creative Commons Atribución-NoComercial 4.0 Internacional (CC BY-NC 4.0)</strong>: puedes usarlo, compartirlo y adaptarlo sin fines comerciales, citando siempre la autoría («Tildín, de Carlos Arellano»).
        </p>
        <p className="small-text">
          <a href="https://creativecommons.org/licenses/by-nc/4.0/deed.es" target="_blank" rel="noopener noreferrer">
            Ver la licencia (creativecommons.org)
          </a>
        </p>
      </section>
      <section className="card">
        <h2>Fuentes</h2>
        <p className="small-text">
          Las reglas siguen la <em>Ortografía de la lengua española</em> (RAE y ASALE, 2010). Las explicaciones, los ejercicios y la mascota son de elaboración propia.
        </p>
      </section>
      <section className="card">
        <h2>Software de terceros</h2>
        <ul className="plain-list small-text">
          <li>React — MIT</li>
          <li>Dexie.js — Apache-2.0</li>
          <li>Zod — MIT</li>
          <li>Workbox / vite-plugin-pwa — MIT</li>
          <li>qrcode-generator — MIT</li>
        </ul>
      </section>
      <section className="card">
        <h2>Privacidad</h2>
        <p className="small-text muted">Sin cuentas, sin anuncios, sin analítica y sin enviar datos a ningún servidor. Todo se guarda en este dispositivo.</p>
      </section>
    </main>
  );
}
