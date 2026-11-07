import { describe, expect, it } from 'vitest';
import { routes } from '../../app.routes';

describe('contribucion routes', () => {
  it('adds US29 without replacing Reportes or Compensaciones', () => {
    const topLevelPaths = routes.map((route) => route.path);

    expect(topLevelPaths).toContain('reportes');
    expect(topLevelPaths).toContain('compensaciones');
    expect(topLevelPaths).toContain('contribucion');
  });

  it('exposes the lazy suggestion route with a trip identifier', () => {
    const contribution = routes.find((route) => route.path === 'contribucion');
    const suggestion = contribution?.children?.find(
      (route) => route.path === 'sugerencia/:viajeId',
    );

    expect(contribution?.loadComponent).toBeTypeOf('function');
    expect(suggestion?.loadComponent).toBeTypeOf('function');
  });
});
