import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Registra el service worker y muestra "Hay una versión nueva → Actualizar".
 * Comprueba si hay actualización al abrir la app y cada hora mientras está abierta.
 */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => void registration.update().catch(() => {}), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-toast" role="alert">
      <span className="grow">✨ Hay una versión nueva</span>
      <button className="btn small" onClick={() => void updateServiceWorker(true)}>
        Actualizar
      </button>
      <button className="icon-btn" style={{ color: '#fff' }} aria-label="Ahora no" onClick={() => setNeedRefresh(false)}>
        ✕
      </button>
    </div>
  );
}
