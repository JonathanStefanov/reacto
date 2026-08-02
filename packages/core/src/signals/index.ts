/**
 * Reacto — Signals (Lifecycle Hooks)
 *
 * Execute pre/post save/delete hooks on model instances.
 *
 *   @Signal('preSave')
 *   hashPassword() { this.password = hash(this.password); }
 */
import type { SignalType, SignalHandler, ModelClass, Model } from '../types.js';

/**
 * Run all handlers for a signal type on a model instance.
 */
export async function runSignal<T extends Model>(
  modelClass: ModelClass<T>,
  type: SignalType,
  instance: T
): Promise<void> {
  const handlers = modelClass.signals.get(type) ?? [];
  for (const handler of handlers) {
    await handler.call(instance, instance);
  }
}

/**
 * Get all registered signal handlers for a model.
 */
export function getSignals(modelClass: ModelClass): Map<SignalType, SignalHandler[]> {
  return modelClass.signals;
}

/**
 * Clear all signals for a model (useful for testing).
 */
export function clearSignals(modelClass: ModelClass): void {
  modelClass.signals.clear();
}
