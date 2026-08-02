/**
 * Reacto — Signal system (Django-style lifecycle hooks)
 *
 * Usage:
 *   preSave(User, async (instance) => { ... });
 *   postSave(User, async (instance) => { ... });
 *   preDelete(User, async (instance) => { ... });
 *   postDelete(User, async (instance) => { ... });
 */
import type { Model, ModelClass } from '../types.js';

export type SignalType = 'pre_save' | 'post_save' | 'pre_delete' | 'post_delete';

export type SignalHandler<T extends Model = Model> = (instance: T) => Promise<void> | void;

interface SignalEntry {
  modelClassName: string;
  handler: SignalHandler;
}

const signals = new Map<SignalType, SignalEntry[]>();

// ─── Register signals ─────────────────────────────────────────────────────────

function addSignal(type: SignalType, modelClass: ModelClass, handler: SignalHandler): void {
  const entries = signals.get(type) ?? [];
  entries.push({ modelClassName: modelClass._modelName, handler });
  signals.set(type, entries);
}

/**
 * Register a pre_save signal.
 * Fires before create() or save() writes to the database.
 */
export function preSave<T extends Model>(modelClass: ModelClass<T>, handler: SignalHandler<T>): void {
  addSignal('pre_save', modelClass, handler as SignalHandler);
}

/**
 * Register a post_save signal.
 * Fires after create() or save() writes to the database.
 */
export function postSave<T extends Model>(modelClass: ModelClass<T>, handler: SignalHandler<T>): void {
  addSignal('post_save', modelClass, handler as SignalHandler);
}

/**
 * Register a pre_delete signal.
 * Fires before delete() removes from the database.
 */
export function preDelete<T extends Model>(modelClass: ModelClass<T>, handler: SignalHandler<T>): void {
  addSignal('pre_delete', modelClass, handler as SignalHandler);
}

/**
 * Register a post_delete signal.
 * Fires after delete() removes from the database.
 */
export function postDelete<T extends Model>(modelClass: ModelClass<T>, handler: SignalHandler<T>): void {
  addSignal('post_delete', modelClass, handler as SignalHandler);
}

// ─── Fire signals ─────────────────────────────────────────────────────────────

/**
 * Fire a signal for a model instance.
 */
export async function fireSignal(type: SignalType, instance: Model): Promise<void> {
  const entries = signals.get(type);
  if (!entries) return;

  const modelName = (instance.constructor as ModelClass)._modelName;

  for (const entry of entries) {
    if (entry.modelClassName === modelName) {
      await entry.handler(instance);
    }
  }
}

/**
 * Clear all registered signals (for testing).
 */
export function clearSignals(): void {
  signals.clear();
}

/**
 * Get registered signal count (for testing).
 */
export function getSignalCount(type: SignalType): number {
  return signals.get(type)?.length ?? 0;
}
