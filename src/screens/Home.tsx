import { Mascot } from '../components/Mascot';
import { routeToHash } from '../app/router';

/** Inicio: racha, objetivo del día y "continuar". (Los datos reales llegan en la fase 6.) */
export function Home() {
  return (
    <main className="screen with-tabbar" aria-labelledby="home-title">
      <div className="topbar">
        <h1 id="home-title">¡Hola!</h1>
        <a className="icon-btn" href={routeToHash({ name: 'parents' })} aria-label="Zona de padres">
          ⚙️
        </a>
      </div>
      <section className="card highlight row">
        <Mascot size={72} bob />
        <div className="grow">
          <strong>¿Listo para practicar?</strong>
          <p className="muted" style={{ margin: '4px 0 0' }}>
            Cada día que estudies sumará a tu racha.
          </p>
        </div>
      </section>
      <a className="btn block" href={routeToHash({ name: 'path' })}>
        Empezar
      </a>
    </main>
  );
}
