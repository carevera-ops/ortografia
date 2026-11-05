/**
 * Cronómetro de tiempo ACTIVO de estudio.
 * - Se pausa al salir de la app o bloquear la pantalla (Page Visibility API).
 * - Se pausa tras 60 s sin interacción (toques o teclas).
 * - Avisa cada pocos segundos (onFlush) con los segundos acumulados desde el último aviso,
 *   para guardarlos en IndexedDB de forma incremental.
 */
export interface ActiveTimerOptions {
  idleMs?: number;
  flushMs?: number;
  onFlush: (deltaSec: number) => void;
  now?: () => number;
  /** Para tests: no registrar listeners del documento. */
  attach?: boolean;
}

export class ActiveTimer {
  private idleMs: number;
  private flushMs: number;
  private onFlush: (deltaSec: number) => void;
  private now: () => number;
  private lastTick: number;
  private lastActivity: number;
  private pendingMs = 0;
  private totalMs = 0;
  private visible = true;
  private running = false;
  private interval: ReturnType<typeof setInterval> | null = null;
  private attach: boolean;

  constructor(opts: ActiveTimerOptions) {
    this.idleMs = opts.idleMs ?? 60_000;
    this.flushMs = opts.flushMs ?? 5_000;
    this.onFlush = opts.onFlush;
    this.now = opts.now ?? (() => Date.now());
    this.attach = opts.attach ?? true;
    this.lastTick = this.now();
    this.lastActivity = this.lastTick;
  }

  private onVisibility = () => {
    this.tick();
    this.visible = document.visibilityState === 'visible';
    if (!this.visible) this.flush();
    else this.lastActivity = this.now();
  };
  private onActivity = () => this.activity();
  private onPageHide = () => {
    this.tick();
    this.flush();
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTick = this.now();
    this.lastActivity = this.lastTick;
    if (this.attach && typeof document !== 'undefined') {
      this.visible = document.visibilityState !== 'hidden';
      document.addEventListener('visibilitychange', this.onVisibility);
      window.addEventListener('pagehide', this.onPageHide);
      for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, this.onActivity, { passive: true });
      this.interval = setInterval(() => {
        this.tick();
        this.flush();
      }, this.flushMs);
    }
  }

  /** Registra interacción del usuario (reanuda si estaba en pausa por inactividad). */
  activity(): void {
    this.tick();
    this.lastActivity = this.now();
  }

  /** Acumula el tiempo transcurrido si cuenta como activo. */
  tick(): void {
    const t = this.now();
    if (this.running && this.visible) {
      // Solo cuenta hasta el momento en que se cumplió la inactividad.
      const activeUntil = Math.min(t, this.lastActivity + this.idleMs);
      if (activeUntil > this.lastTick) {
        const d = activeUntil - this.lastTick;
        this.pendingMs += d;
        this.totalMs += d;
      }
    }
    this.lastTick = t;
  }

  flush(): void {
    const sec = Math.floor(this.pendingMs / 1000);
    if (sec > 0) {
      this.pendingMs -= sec * 1000;
      this.onFlush(sec);
    }
  }

  /** Segundos activos totales desde start(). */
  get activeSeconds(): number {
    return Math.floor(this.totalMs / 1000);
  }

  isIdle(): boolean {
    return this.now() - this.lastActivity >= this.idleMs;
  }

  stop(): void {
    if (!this.running) return;
    this.tick();
    this.flush();
    this.running = false;
    if (this.interval) clearInterval(this.interval);
    if (this.attach && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
      window.removeEventListener('pagehide', this.onPageHide);
      for (const ev of ['pointerdown', 'keydown'] as const) window.removeEventListener(ev, this.onActivity);
    }
  }

  /** Solo para tests: simula ocultar/mostrar la app. */
  setVisible(v: boolean): void {
    this.tick();
    this.visible = v;
    if (v) this.lastActivity = this.now();
  }
}
