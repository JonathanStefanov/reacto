import { describe, it, expect, beforeEach } from 'vitest';
import { generateCrudRoutes } from './crud.js';
import type { ModelClass, RelationDefinition } from '@reacto/core';
import { registerModel, clearRegistry } from '@reacto/core';

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

function createMockModelWithRelations(): ModelClass {
  // Register the target model first
  const userModel = {
    _modelName: 'User',
    tableName: 'users',
    fields: new Map([
      ['username', { name: 'username', propertyKey: 'username', type: 'string' }],
    ]),
    relations: new Map(),
    meta: { tableName: 'users' },
  } as unknown as ModelClass;
  registerModel(userModel);

  const relations = new Map<string, RelationDefinition>();
  relations.set('author', {
    name: 'author',
    type: 'foreignKey',
    targetModel: 'User',
    foreignKeyColumn: 'author_id',
    propertyKey: 'author',
    onDelete: 'CASCADE',
  });

  return {
    _modelName: 'Post',
    tableName: 'posts',
    fields: new Map([
      ['title', { name: 'title', propertyKey: 'title', type: 'string' }],
      ['author', { name: 'author_id', propertyKey: 'author', type: 'integer', dbColumn: 'author_id' }],
    ]),
    relations,
    meta: { tableName: 'posts' },
  } as unknown as ModelClass;
}

function createMockModelWithOneToMany(): ModelClass {
  // Register the target model first
  const postModel = {
    _modelName: 'Post',
    tableName: 'posts',
    fields: new Map([
      ['title', { name: 'title', propertyKey: 'title', type: 'string' }],
      ['author', { name: 'author_id', propertyKey: 'author', type: 'integer', dbColumn: 'author_id' }],
    ]),
    relations: new Map([
      ['author', {
        name: 'author',
        type: 'foreignKey' as const,
        targetModel: 'User',
        foreignKeyColumn: 'author_id',
        propertyKey: 'author',
      }],
    ]),
    meta: { tableName: 'posts' },
  } as unknown as ModelClass;
  registerModel(postModel);

  const relations = new Map<string, RelationDefinition>();
  relations.set('posts', {
    name: 'posts',
    type: 'oneToMany',
    targetModel: 'Post',
    propertyKey: 'posts',
    mappedBy: 'author',
  });

  return {
    _modelName: 'User',
    tableName: 'users',
    fields: new Map([
      ['username', { name: 'username', propertyKey: 'username', type: 'string' }],
    ]),
    relations,
    meta: { tableName: 'users' },
  } as unknown as ModelClass;
}

describe('generateCrudRoutes', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('returns an Express Router', () => {
    const router = generateCrudRoutes(createMockModelClass());
    expect(router).toBeDefined();
    expect(typeof router).toBe('function');
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

    expect(routes).toContain('GET /');
    expect(routes).toContain('POST /');
    expect(routes).toContain('GET /count');
    expect(routes).toContain('GET /:id');
    expect(routes).toContain('PUT /:id');
    expect(routes).toContain('PATCH /:id');
    expect(routes).toContain('DELETE /:id');
    expect(routes).toContain('POST /bulk');
  });

  it('registers exactly 8 routes for a model without relations', () => {
    const router = generateCrudRoutes(createMockModelClass()) as any;
    const routeCount = router.stack.filter((l: any) => l.route).length;
    expect(routeCount).toBe(8);
  });

  it('adds nested route for ForeignKey relations', () => {
    const router = generateCrudRoutes(createMockModelWithRelations()) as any;
    const routes: string[] = [];

    for (const layer of router.stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        for (const method of methods) {
          routes.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      }
    }

    // Should have the nested GET /:id/author route
    expect(routes).toContain('GET /:id/author');
  });

  it('adds nested routes for OneToMany relations', () => {
    const router = generateCrudRoutes(createMockModelWithOneToMany()) as any;
    const routes: string[] = [];

    for (const layer of router.stack) {
      if (layer.route) {
        const methods = Object.keys(layer.route.methods);
        for (const method of methods) {
          routes.push(`${method.toUpperCase()} ${layer.route.path}`);
        }
      }
    }

    // Should have nested GET and POST /:id/posts routes
    expect(routes).toContain('GET /:id/posts');
    expect(routes).toContain('POST /:id/posts');
  });
});
