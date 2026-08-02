import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { preSave, postSave, preDelete, postDelete, clearSignals, getSignalCount, fireSignal } from './index.js';
import { Field, ModelDecorator } from '../decorators/index.js';
import { Model } from '../types.js';

describe('signals', () => {
  beforeEach(() => {
    clearSignals();
  });

  describe('registration', () => {
    it('registers pre_save handlers', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      preSave(User, () => {});
      expect(getSignalCount('pre_save')).toBe(1);
    });

    it('registers post_save handlers', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      postSave(User, () => {});
      expect(getSignalCount('post_save')).toBe(1);
    });

    it('registers pre_delete handlers', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      preDelete(User, () => {});
      expect(getSignalCount('pre_delete')).toBe(1);
    });

    it('registers post_delete handlers', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      postDelete(User, () => {});
      expect(getSignalCount('post_delete')).toBe(1);
    });

    it('registers multiple handlers for same signal', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      preSave(User, () => {});
      preSave(User, () => {});
      expect(getSignalCount('pre_save')).toBe(2);
    });
  });

  describe('firing', () => {
    it('fires pre_save for matching model', async () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      let fired = false;
      preSave(User, () => { fired = true; });

      const instance = new User() as any;
      instance.username = 'john';
      await fireSignal('pre_save', instance);
      expect(fired).toBe(true);
    });

    it('does not fire for different model', async () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      let fired = false;
      preSave(User, () => { fired = true; });

      const post = new Post() as any;
      post.title = 'hello';
      await fireSignal('pre_save', post);
      expect(fired).toBe(false);
    });

    it('fires async handlers', async () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      let value = 0;
      preSave(User, async () => {
        await new Promise((r) => setTimeout(r, 10));
        value = 42;
      });

      const instance = new User() as any;
      await fireSignal('pre_save', instance);
      expect(value).toBe(42);
    });

    it('handler receives the instance', async () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      let receivedName = '';
      preSave(User, (instance: any) => {
        receivedName = instance.username;
      });

      const instance = new User() as any;
      instance.username = 'john';
      await fireSignal('pre_save', instance);
      expect(receivedName).toBe('john');
    });
  });

  describe('clearSignals', () => {
    it('removes all registered signals', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      preSave(User, () => {});
      postSave(User, () => {});
      preDelete(User, () => {});

      clearSignals();
      expect(getSignalCount('pre_save')).toBe(0);
      expect(getSignalCount('post_save')).toBe(0);
      expect(getSignalCount('pre_delete')).toBe(0);
    });
  });
});
