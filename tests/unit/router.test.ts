import { describe, expect, it } from 'vitest';
import { parseHash, routeToHash, type Route } from '../../src/app/router';

describe('router', () => {
  it('interpreta rutas conocidas', () => {
    expect(parseHash('')).toEqual({ name: 'home' });
    expect(parseHash('#/')).toEqual({ name: 'home' });
    expect(parseHash('#/camino')).toEqual({ name: 'path' });
    expect(parseHash('#/leccion/A4/2')).toEqual({ name: 'lesson', unitId: 'A4', level: 2 });
    expect(parseHash('#/teoria/agudas')).toEqual({ name: 'theory', ruleId: 'agudas' });
  });

  it('las rutas mal formadas vuelven a sitios seguros', () => {
    expect(parseHash('#/leccion/A4/x')).toEqual({ name: 'path' });
    expect(parseHash('#/nada')).toEqual({ name: 'home' });
  });

  it('ida y vuelta', () => {
    const routes: Route[] = [
      { name: 'home' },
      { name: 'path' },
      { name: 'lesson', unitId: 'A11', level: 3 },
      { name: 'practice' },
      { name: 'result', sessionId: 'abc-123' },
      { name: 'progress' },
      { name: 'theory' },
      { name: 'theory', ruleId: 'diacritica' },
      { name: 'parents' },
      { name: 'install' },
    ];
    for (const r of routes) expect(parseHash(routeToHash(r))).toEqual(r);
  });
});
