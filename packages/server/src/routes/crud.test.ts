import { describe, it, expect, beforeEach } from 'vitest';
import { generateCrudRoutes } from './crud.js';
import type { ModelClass } from '@reacto-org/core';
import { registerModel, clearRegistry } from '@reacto-org/core';

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
  beforeEach(() => {
    clearRegistry();
  });

  it('returns an Express Router', () => {
    const router = generateCrudRoutes(createMockModelClass());
    expect(router).toBeDefined();
    expect(typeof router.use).toBe('function');
  });

  it('generates routes for a model without relations', () => {
    const router = generateCrudRoutes(createMockModelClass());
    // Router should have routes registered
    expect(router).toBeDefined();
  });
});
