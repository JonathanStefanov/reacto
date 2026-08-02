import { describe, it, expect } from 'vitest';
import { generateCrudRoutes } from './crud.js';
import type { ModelClass } from '@reacto/core';

function createMockModelClass(): ModelClass {
  return {
    _modelName: 'TestModel',
    tableName: 'test_models',
    fields: new Map([
      ['name', { name: 'name', propertyKey: 'name', type: 'string' }],
      ['email', { name: 'email', propertyKey: 'email', type: 'email' }],
    ]),
    relations: new Map(),
    meta: { tableName: 'test_models' },
  } as unknown as ModelClass;
}

describe('generateCrudRoutes', () => {
  it('returns an Express Router', () => {
    const router = generateCrudRoutes(createMockModelClass());
    expect(router).toBeDefined();
    expect(typeof router).toBe('function'); // Express Router is a function
  });

  it('router has a stack with routes', () => {
    const router = generateCrudRoutes(createMockModelClass()) as any;
    expect(router.stack).toBeDefined();
    expect(Array.isArray(router.stack)).toBe(true);
  });

  it('registers the expected HTTP method routes', () => {
    const router = generateCrudRoutes(createMockModelClass()) as any;
    const routes: string[] = [];

    for (const layer of router.stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        for (const method of methods) {
          routes.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      }
    }

    // Expected routes
    expect(routes).toContain('GET /');
    expect(routes).toContain('POST /');
    expect(routes).toContain('GET /count');
    expect(routes).toContain('GET /:id');
    expect(routes).toContain('PUT /:id');
    expect(routes).toContain('PATCH /:id');
    expect(routes).toContain('DELETE /:id');
    expect(routes).toContain('POST /bulk');
  });

  it('registers exactly 8 routes', () => {
    const router = generateCrudRoutes(createMockModelClass()) as any;
    const routeCount = router.stack.filter((l: any) => l.route).length;
    expect(routeCount).toBe(8);
  });
});
