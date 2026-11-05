import { describe, expect, it } from 'vitest';
import { ActiveTimer } from '../../src/core/timer/activeTimer';

function setup() {
  let t = 0;
  const flushed: number[] = [];
  const timer = new ActiveTimer({ now: () => t, attach: false, onFlush: (s) => flushed.push(s) });
  return { timer, flushed, advance: (ms: number) => (t += ms) };
}

describe('cronómetro de tiempo activo', () => {
  it('cuenta el tiempo con interacción', () => {
    const { timer, advance } = setup();
    timer.start();
    for (let i = 0; i < 6; i++) {
      advance(10_000);
      timer.activity();
    }
    timer.stop();
    expect(timer.activeSeconds).toBe(60);
  });
  it('se pausa tras 60 s sin interacción', () => {
    const { timer, advance } = setup();
    timer.start();
    advance(5 * 60_000); // 5 minutos sin tocar nada
    timer.tick();
    expect(timer.activeSeconds).toBe(60);
    expect(timer.isIdle()).toBe(true);
    timer.activity(); // vuelve
    advance(10_000);
    timer.tick();
    expect(timer.activeSeconds).toBe(70);
  });
  it('no cuenta con la app oculta', () => {
    const { timer, advance } = setup();
    timer.start();
    advance(10_000);
    timer.setVisible(false);
    advance(30_000);
    timer.setVisible(true);
    advance(5_000);
    timer.tick();
    expect(timer.activeSeconds).toBe(15);
  });
  it('vuelca los segundos de forma incremental', () => {
    const { timer, flushed, advance } = setup();
    timer.start();
    advance(5_500);
    timer.tick();
    timer.flush();
    advance(4_600);
    timer.activity();
    timer.flush();
    timer.stop();
    expect(flushed).toEqual([5, 5]);
  });
});
