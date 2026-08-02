import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { runSignal, getSignals, clearSignals } from './index.js';
import { Field, ModelDecorator, Signal } from '../decorators/index.js';
import { Model } from '../types.js';

describe('signals', () => {
  describe('registration via @Signal decorator', () => {
    it('registers preSave handler via decorator', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        onPreSave() {}
      }

      const signals = getSignals(User);
      expect(signals.has('preSave')).toBe(true);
      expect(signals.get('preSave')!.length).toBe(1);
    });

    it('registers postSave handler via decorator', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('postSave')
        onPostSave() {}
      }

      const signals = getSignals(User);
      expect(signals.has('postSave')).toBe(true);
    });

    it('registers preDelete handler via decorator', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preDelete')
        onPreDelete() {}
      }

      const signals = getSignals(User);
      expect(signals.has('preDelete')).toBe(true);
    });

    it('registers postDelete handler via decorator', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('postDelete')
        onPostDelete() {}
      }

      const signals = getSignals(User);
      expect(signals.has('postDelete')).toBe(true);
    });

    it('registers multiple handlers for same signal', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        onPreSave1() {}

        @Signal('preSave')
        onPreSave2() {}
      }

      const signals = getSignals(User);
      expect(signals.get('preSave')!.length).toBe(2);
    });
  });

  describe('runSignal', () => {
    it('fires preSave handler', async () => {
      let fired = false;

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        onPreSave() {
          fired = true;
        }
      }

      const instance = new User() as any;
      instance.username = 'john';
      await runSignal(User, 'preSave', instance);
      expect(fired).toBe(true);
    });

    it('handler receives the instance', async () => {
      let receivedName = '';

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        onPreSave() {
          receivedName = (this as any).username;
        }
      }

      const instance = new User() as any;
      instance.username = 'john';
      await runSignal(User, 'preSave', instance);
      expect(receivedName).toBe('john');
    });

    it('fires async handlers', async () => {
      let value = 0;

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        async onPreSave() {
          await new Promise((r) => setTimeout(r, 10));
          value = 42;
        }
      }

      const instance = new User() as any;
      await runSignal(User, 'preSave', instance);
      expect(value).toBe(42);
    });

    it('does nothing when no handlers registered', async () => {
      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      const instance = new Post() as any;
      // Should not throw
      await runSignal(Post, 'preSave', instance);
    });
  });

  describe('clearSignals', () => {
    it('removes all registered signals from a model', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @Signal('preSave')
        onPreSave() {}

        @Signal('postSave')
        onPostSave() {}
      }

      const signalsBefore = getSignals(User);
      expect(signalsBefore.size).toBeGreaterThan(0);

      clearSignals(User);

      const signalsAfter = getSignals(User);
      expect(signalsAfter.size).toBe(0);
    });
  });
});
