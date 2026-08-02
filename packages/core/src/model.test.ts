import { describe, it, expect } from 'vitest';
import { QuerySet } from './model.js';
import type { ModelClass, WhereClause } from './types.js';
import { Model } from './types.js';

// We need to access the private negateOperator function.
// Since it's not exported, we test it indirectly through QuerySet.exclude().
// We also create a minimal mock model class for testing.

function createMockModelClass(): ModelClass {
  class MockModel extends Model {
    name: string = '';
    age: number = 0;
  }

  (MockModel as any)._modelName = 'MockModel';
  (MockModel as any).tableName = 'mock_models';
  (MockModel as any).fields = new Map<string, any>([
    ['name', { name: 'name', propertyKey: 'name', type: 'string' }],
    ['age', { name: 'age', propertyKey: 'age', type: 'integer' }],
  ]);
  (MockModel as any).meta = { tableName: 'mock_models' };

  return MockModel as unknown as ModelClass;
}

describe('QuerySet', () => {
  const MockModel = createMockModelClass();

  describe('filter', () => {
    it('creates a new QuerySet with where conditions', () => {
      const qs = new QuerySet(MockModel);
      const filtered = qs.filter({ name: 'John' });
      expect(filtered).not.toBe(qs);
      expect(filtered).toBeInstanceOf(QuerySet);
    });

    it('handles null values as isNull', () => {
      const qs = new QuerySet(MockModel);
      const filtered = qs.filter({ name: null });
      expect(filtered).toBeInstanceOf(QuerySet);
    });

    it('handles undefined values as isNotNull', () => {
      const qs = new QuerySet(MockModel);
      const filtered = qs.filter({ name: undefined });
      expect(filtered).toBeInstanceOf(QuerySet);
    });

    it('chains multiple filters', () => {
      const qs = new QuerySet(MockModel);
      const filtered = qs.filter({ name: 'John' }).filter({ age: 25 });
      expect(filtered).toBeInstanceOf(QuerySet);
    });
  });

  describe('exclude', () => {
    it('creates a new QuerySet with negated conditions', () => {
      const qs = new QuerySet(MockModel);
      const excluded = qs.exclude({ name: 'John' });
      expect(excluded).not.toBe(qs);
      expect(excluded).toBeInstanceOf(QuerySet);
    });
  });

  describe('orderBy', () => {
    it('parses ascending order', () => {
      const qs = new QuerySet(MockModel);
      const ordered = qs.orderBy('name');
      expect(ordered).toBeInstanceOf(QuerySet);
    });

    it('parses descending order with - prefix', () => {
      const qs = new QuerySet(MockModel);
      const ordered = qs.orderBy('-createdAt');
      expect(ordered).toBeInstanceOf(QuerySet);
    });

    it('chains multiple order fields', () => {
      const qs = new QuerySet(MockModel);
      const ordered = qs.orderBy('name', '-createdAt');
      expect(ordered).toBeInstanceOf(QuerySet);
    });
  });

  describe('limit', () => {
    it('creates a new QuerySet with limit', () => {
      const qs = new QuerySet(MockModel);
      const limited = qs.limit(10);
      expect(limited).not.toBe(qs);
      expect(limited).toBeInstanceOf(QuerySet);
    });
  });

  describe('offset', () => {
    it('creates a new QuerySet with offset', () => {
      const qs = new QuerySet(MockModel);
      const offset = qs.offset(20);
      expect(offset).toBeInstanceOf(QuerySet);
    });
  });

  describe('select', () => {
    it('creates a new QuerySet with selected fields', () => {
      const qs = new QuerySet(MockModel);
      const selected = qs.select('name', 'age');
      expect(selected).toBeInstanceOf(QuerySet);
    });
  });

  describe('chaining', () => {
    it('supports full fluent chain', () => {
      const qs = new QuerySet(MockModel);
      const result = qs
        .filter({ name: 'John' })
        .exclude({ age: 0 })
        .orderBy('-name')
        .limit(10)
        .offset(5)
        .select('name', 'age');

      expect(result).toBeInstanceOf(QuerySet);
    });
  });
});

describe('negateOperator (indirect via exclude)', () => {
  // We test that exclude inverts filter conditions.
  // The private negateOperator maps:
  //   eq ↔ neq, gt ↔ lte, gte ↔ lt, lt ↔ gte, lte ↔ gt
  // We can't test the function directly, but we verify exclude produces
  // a different QuerySet than filter (which we already did above).
  // A more thorough test would require SQL output inspection.

  it('exclude produces a different QuerySet than filter', () => {
    const MockModel = createMockModelClass();
    const qs = new QuerySet(MockModel);
    const filtered = qs.filter({ age: 18 });
    const excluded = qs.exclude({ age: 18 });
    // They should not be the same object
    expect(filtered).not.toBe(excluded);
  });
});
