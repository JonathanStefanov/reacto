/**
 * Reacto — Model Registry (auto-discovery of all models)
 */
import type { ModelClass, Model } from './types.js';

const models = new Map<string, ModelClass>();

/**
 * Register a model in the global registry.
 */
export function registerModel(modelClass: ModelClass): void {
  const name = modelClass._modelName;
  if (models.has(name)) {
    console.warn(`[Reacto] Model "${name}" is already registered. Overwriting.`);
  }
  models.set(name, modelClass);
}

/**
 * Get a registered model by name.
 */
export function getModel(name: string): ModelClass | undefined {
  return models.get(name);
}

/**
 * Get all registered models.
 */
export function getAllModels(): Map<string, ModelClass> {
  return new Map(models);
}

/**
 * Get all registered models as an array.
 */
export function getModelList(): ModelClass[] {
  return Array.from(models.values());
}

/**
 * Check if a model is registered.
 */
export function hasModel(name: string): boolean {
  return models.has(name);
}

/**
 * Clear all registered models (for testing).
 */
export function clearRegistry(): void {
  models.clear();
}
