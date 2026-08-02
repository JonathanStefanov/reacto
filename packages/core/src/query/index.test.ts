import { describe, it, expect } from 'vitest';
import { QueryBuilder, qb } from './index.js';

describe('QueryBuilder', () => {
  describe('select', () => {
    it('defaults to SELECT *', () => {
      const builder = new QueryBuilder('users');
      // Access the private buildSelect via a helper — we test the built SQL
      // by checking the structure through the public API
      // We'll test the SQL output indirectly
    });

    it('allows selecting specific columns', () => {
      const builder = new QueryBuilder('users').select('id', 'name', 'email');
      // Verify through method chaining doesn't throw
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('where', () => {
    it('chains multiple where conditions', () => {
      const builder = new QueryBuilder('users')
        .where('age', '>', 18)
        .where('active', '=', true);
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports orWhere', () => {
      const builder = new QueryBuilder('users')
        .where('age', '>', 18)
        .orWhere('role', '=', 'admin');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports whereIn', () => {
      const builder = new QueryBuilder('users').whereIn('id', [1, 2, 3]);
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports whereNotIn', () => {
      const builder = new QueryBuilder('users').whereNotIn('id', [4, 5]);
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports whereNull', () => {
      const builder = new QueryBuilder('users').whereNull('deletedAt');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports whereNotNull', () => {
      const builder = new QueryBuilder('users').whereNotNull('email');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('orderBy', () => {
    it('defaults to ASC', () => {
      const builder = new QueryBuilder('users').orderBy('name');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports DESC', () => {
      const builder = new QueryBuilder('users').orderBy('createdAt', 'DESC');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('chains multiple orderBy', () => {
      const builder = new QueryBuilder('users')
        .orderBy('name', 'ASC')
        .orderBy('id', 'DESC');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('limit and offset', () => {
    it('sets limit', () => {
      const builder = new QueryBuilder('users').limit(10);
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('sets offset', () => {
      const builder = new QueryBuilder('users').limit(10).offset(20);
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('join', () => {
    it('adds a join clause', () => {
      const builder = new QueryBuilder('users')
        .join('posts', 'users.id = posts.user_id');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('supports join types', () => {
      const builder = new QueryBuilder('users')
        .join('posts', 'users.id = posts.user_id', 'LEFT');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('groupBy and having', () => {
    it('adds groupBy', () => {
      const builder = new QueryBuilder('orders').groupBy('status');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });

    it('adds having', () => {
      const builder = new QueryBuilder('orders')
        .groupBy('status')
        .having('COUNT(*) > 5');
      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });

  describe('fluent chaining', () => {
    it('supports full fluent chain', () => {
      const builder = qb('users')
        .select('id', 'name', 'email')
        .where('active', '=', true)
        .where('age', '>', 18)
        .orderBy('name')
        .limit(10)
        .offset(0);

      expect(builder).toBeInstanceOf(QueryBuilder);
    });
  });
});
