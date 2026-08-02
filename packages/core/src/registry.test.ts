import { describe, it, expect, beforeEach } from 'vitest';
import { registerModel, getModel, getAllModels, hasModel, clearRegistry } from './registry.js';
import type { ModelClass } from './types.js';

describe('Registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registers and retrieves a model', () => {
    const mockModel = {
      _modelName: 'TestModel',
      tableName: 'test_models',
      fields: new Map(),
      relations: new Map(),
      meta: { tableName: 'test_models' },
    } as unknown as ModelClass;

    registerModel(mockModel);
    expect(hasModel('TestModel')).toBe(true);
    expect(getModel('TestModel')).toBe(mockModel);
  });

  it('returns undefined for unknown models', () => {
    expect(getModel('Unknown')).toBeUndefined();
    expect(hasModel('Unknown')).toBe(false);
  });

  it('returns all registered models', () => {
    const model1 = { _modelName: 'A', tableName: 'a', fields: new Map(), relations: new Map(), meta: { tableName: 'a' } } as unknown as ModelClass;
    const model2 = { _modelName: 'B', tableName: 'b', fields: new Map(), relations: new Map(), meta: { tableName: 'b' } } as unknown as ModelClass;

    registerModel(model1);
    registerModel(model2);

    const all = getAllModels();
    expect(all.size).toBe(2);
    expect(all.has('A')).toBe(true);
    expect(all.has('B')).toBe(true);
  });

  it('clears the registry', () => {
    const model = { _modelName: 'X', tableName: 'x', fields: new Map(), relations: new Map(), meta: { tableName: 'x' } } as unknown as ModelClass;
    registerModel(model);
    expect(getAllModels().size).toBe(1);

    clearRegistry();
    expect(getAllModels().size).toBe(0);
  });
});
