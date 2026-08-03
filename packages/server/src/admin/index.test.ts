/**
 * Tests for Reacto Admin Dashboard
 */
import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { createAdminRoutes, generateAdminHtml } from './index.js';
import { clearRegistry, ModelDecor } from '@reacto-org/core';
import { Field } from '@reacto-org/core';
import { Model } from '@reacto-org/core';
import express from 'express';
import request from 'supertest';

// ─── Test Models ─────────────────────────────────────────────────────────────

function createTestModels() {
  @ModelDecor({ tableName: 'test_users' })
  class TestUser extends Model {
    @Field({ type: 'string', maxLength: 150, unique: true })
    username!: string;

    @Field({ type: 'email' })
    email!: string;

    @Field({ type: 'boolean', default: false })
    isActive!: boolean;
  }

  @ModelDecor({ tableName: 'test_posts' })
  class TestPost extends Model {
    @Field({ type: 'string', maxLength: 255 })
    title!: string;

    @Field({ type: 'text' })
    content!: string;
  }

  return { TestUser, TestPost };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Admin Routes', () => {
  let app: express.Express;

  beforeEach(() => {
    clearRegistry();
    const { TestUser, TestPost } = createTestModels();

    app = express();
    app.use(express.json());
    app.use('/api', createAdminRoutes());
  });

  describe('GET /api/meta', () => {
    it('returns all model metadata', async () => {
      const res = await request(app).get('/api/meta').expect(200);

      expect(res.body.models.length).toBeGreaterThanOrEqual(2);
      expect(res.body.count).toBeGreaterThanOrEqual(2);
      expect(res.body.timestamp).toBeDefined();

      const userMeta = res.body.models.find((m: { name: string }) => m.name === 'TestUser');
      expect(userMeta).toBeDefined();
      expect(userMeta.tableName).toBe('test_users');
      expect(userMeta.fields.length).toBeGreaterThanOrEqual(3);
    });

    it('includes field details', async () => {
      const res = await request(app).get('/api/meta').expect(200);

      const userMeta = res.body.models.find((m: { name: string }) => m.name === 'TestUser');
      const usernameField = userMeta.fields.find((f: { name: string }) => f.name === 'username');

      expect(usernameField).toBeDefined();
      expect(usernameField.type).toBe('string');
      expect(usernameField.maxLength).toBe(150);
      expect(usernameField.unique).toBe(true);
    });

    it('includes built-in fields (id, createdAt, updatedAt)', async () => {
      const res = await request(app).get('/api/meta').expect(200);

      const userMeta = res.body.models.find((m: { name: string }) => m.name === 'TestUser');
      const fieldNames = userMeta.fields.map((f: { name: string }) => f.name);

      expect(fieldNames).toContain('id');
      expect(fieldNames).toContain('createdAt');
      expect(fieldNames).toContain('updatedAt');
    });
  });

  describe('GET /api/meta/:model', () => {
    it('returns a single model by name', async () => {
      const res = await request(app).get('/api/meta/TestUser').expect(200);

      expect(res.body.name).toBe('TestUser');
      expect(res.body.tableName).toBe('test_users');
      expect(res.body.fields).toBeDefined();
      expect(res.body.relations).toBeDefined();
    });

    it('returns 404 for unknown model', async () => {
      const res = await request(app).get('/api/meta/Unknown').expect(404);

      expect(res.body.error).toContain('not found');
    });
  });

  describe('GET /api/health', () => {
    it('returns admin health status', async () => {
      const res = await request(app).get('/api/health').expect(200);

      expect(res.body.status).toBe('ok');
      expect(res.body.models).toContain('TestUser');
      expect(res.body.models).toContain('TestPost');
      expect(res.body.modelCount).toBeGreaterThanOrEqual(2);
      expect(res.body.timestamp).toBeDefined();
    });
  });
});

describe('generateAdminHtml', () => {
  it('returns valid HTML', () => {
    const html = generateAdminHtml('/api');

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Reacto Admin</title>');
    expect(html).toContain('reacto-admin-root');
  });

  it('includes the API base path', () => {
    const html = generateAdminHtml('/api/v2');

    expect(html).toContain("'/api/v2'");
    expect(html).toContain('/_admin');
  });

  it('includes all CRUD functionality', () => {
    const html = generateAdminHtml('/api');

    expect(html).toContain('loadRecords');
    expect(html).toContain('createRecord');
    expect(html).toContain('updateRecord');
    expect(html).toContain('deleteRecord');
    expect(html).toContain('handleFormSubmit');
  });

  it('includes CSS styling', () => {
    const html = generateAdminHtml('/api');

    expect(html).toContain('.reacto-admin-layout');
    expect(html).toContain('.reacto-table');
    expect(html).toContain('.reacto-admin-sidebar');
  });
});
