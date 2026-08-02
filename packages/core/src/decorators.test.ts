import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { Field, ModelDecorator } from './decorators/index.js';
import { clearRegistry, getModel } from './registry.js';
import { Model } from './types.js';

describe('decorators', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('@Field', () => {
    it('registers field metadata on the prototype', () => {
      class TestClass {
        @Field({ type: 'string', maxLength: 100 })
        name!: string;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields).toBeDefined();
      expect(fields.has('name')).toBe(true);
      expect(fields.get('name').type).toBe('string');
      expect(fields.get('name').maxLength).toBe(100);
      expect(fields.get('name').propertyKey).toBe('name');
    });

    it('registers multiple fields', () => {
      class TestClass {
        @Field({ type: 'string' })
        name!: string;

        @Field({ type: 'integer' })
        age!: number;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.size).toBe(2);
      expect(fields.has('name')).toBe(true);
      expect(fields.has('age')).toBe(true);
    });

    it('uses dbColumn override when provided', () => {
      class TestClass {
        @Field({ type: 'datetime', dbColumn: 'created_at' })
        createdAt!: Date;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.get('createdAt').name).toBe('created_at');
      expect(fields.get('createdAt').dbColumn).toBe('created_at');
    });

    it('defaults name to propertyKey when no dbColumn', () => {
      class TestClass {
        @Field({ type: 'string' })
        username!: string;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.get('username').name).toBe('username');
    });
  });

  describe('@Model', () => {
    it('registers the model in the global registry', () => {
      @ModelDecorator({ tableName: 'test_items' })
      class TestItem extends Model {
        @Field({ type: 'string' })
        name!: string;
      }

      expect(getModel('TestItem')).toBeDefined();
    });

    it('sets tableName on the class', () => {
      @ModelDecorator({ tableName: 'products' })
      class Product extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      expect((Product as any).tableName).toBe('products');
    });

    it('sets _modelName on the class', () => {
      @ModelDecorator({ tableName: 'items' })
      class Item extends Model {
        @Field({ type: 'string' })
        label!: string;
      }

      expect((Item as any)._modelName).toBe('Item');
    });

    it('sets meta with default ordering', () => {
      @ModelDecorator({ tableName: 'things' })
      class Thing extends Model {
        @Field({ type: 'string' })
        name!: string;
      }

      const meta = (Thing as any).meta;
      expect(meta.tableName).toBe('things');
      expect(meta.ordering).toEqual(['-createdAt']);
      expect(meta.verboseName).toBe('thing');
      expect(meta.verboseNamePlural).toBe('things');
    });

    it('allows custom ordering and verbose names', () => {
      @ModelDecorator({
        tableName: 'events',
        ordering: ['createdAt'],
        verboseName: 'event',
        verboseNamePlural: 'events',
      })
      class Event extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      const meta = (Event as any).meta;
      expect(meta.ordering).toEqual(['createdAt']);
      expect(meta.verboseName).toBe('event');
      expect(meta.verboseNamePlural).toBe('events');
    });

    it('collects fields including built-ins', () => {
      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      const fields = (Post as any).fields;
      expect(fields.has('id')).toBe(true);
      expect(fields.has('createdAt')).toBe(true);
      expect(fields.has('updatedAt')).toBe(true);
      expect(fields.has('title')).toBe(true);
    });
  });
});
