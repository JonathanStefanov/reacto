/**
 * Reacto — Field validators (Django-style field validation)
 *
 * Usage:
 *   @Field({ type: 'string', maxLength: 150, validators: [required(), minLength(3)] })
 *   username: string;
 *
 * Built-in validators:
 *   required()        — value must be present and non-empty
 *   minLength(n)      — string length >= n
 *   maxLength(n)      — string length <= n
 *   min(n)            — number >= n
 *   max(n)            — number <= n
 *   pattern(regex)    — string matches regex
 *   email()           — valid email format
 *   url()             — valid URL format
 *   oneOf([...])      — value must be one of the allowed values
 *   custom(fn)        — custom validation function
 */

import type { Validator } from '../types.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// Re-export for convenience
export type { Validator } from '../types.js';

// ─── Built-in Validators ──────────────────────────────────────────────────────

/**
 * Value must be present and non-empty.
 */
export function required(): Validator {
  return {
    name: 'required',
    validate(value, field) {
      if (value === null || value === undefined || value === '') {
        return `${field} is required`;
      }
      return null;
    },
  };
}

/**
 * String length must be >= min.
 */
export function minLength(min: number): Validator {
  return {
    name: 'minLength',
    validate(value, field) {
      if (typeof value === 'string' && value.length < min) {
        return `${field} must be at least ${min} characters`;
      }
      return null;
    },
  };
}

/**
 * String length must be <= max.
 */
export function maxLength(max: number): Validator {
  return {
    name: 'maxLength',
    validate(value, field) {
      if (typeof value === 'string' && value.length > max) {
        return `${field} must be at most ${max} characters`;
      }
      return null;
    },
  };
}

/**
 * Number must be >= min.
 */
export function min(min: number): Validator {
  return {
    name: 'min',
    validate(value, field) {
      if (typeof value === 'number' && value < min) {
        return `${field} must be at least ${min}`;
      }
      return null;
    },
  };
}

/**
 * Number must be <= max.
 */
export function max(max: number): Validator {
  return {
    name: 'max',
    validate(value, field) {
      if (typeof value === 'number' && value > max) {
        return `${field} must be at most ${max}`;
      }
      return null;
    },
  };
}

/**
 * String must match a regex pattern.
 */
export function pattern(regex: RegExp, message?: string): Validator {
  return {
    name: 'pattern',
    validate(value, field) {
      if (typeof value === 'string' && !regex.test(value)) {
        return message ?? `${field} is not in a valid format`;
      }
      return null;
    },
  };
}

/**
 * Must be a valid email format.
 */
export function email(): Validator {
  return pattern(
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    'Must be a valid email address'
  );
}

/**
 * Must be a valid URL format.
 */
export function url(): Validator {
  return pattern(
    /^https?:\/\/.+/,
    'Must be a valid URL'
  );
}

/**
 * Value must be one of the allowed values.
 */
export function oneOf(allowed: unknown[]): Validator {
  return {
    name: 'oneOf',
    validate(value, field) {
      if (!allowed.includes(value)) {
        return `${field} must be one of: ${allowed.join(', ')}`;
      }
      return null;
    },
  };
}

/**
 * Custom validation function.
 */
export function custom(fn: (value: unknown) => string | null): Validator {
  return {
    name: 'custom',
    validate(value, field) {
      return fn(value) ?? null;
    },
  };
}

// ─── Validation Runner ────────────────────────────────────────────────────────

/**
 * Run validators against a value.
 */
export function validateField(
  value: unknown,
  fieldName: string,
  validators: Validator[]
): string[] {
  const errors: string[] = [];
  for (const validator of validators) {
    const error = validator.validate(value, fieldName);
    if (error) {
      errors.push(error);
    }
  }
  return errors;
}

/**
 * Validate all fields of a model instance.
 */
export function validateModel(
  data: Record<string, unknown>,
  fields: Map<string, { validators?: Validator[] }>,
  modelClassName: string
): ValidationResult {
  const errors: string[] = [];

  for (const [fieldKey, fieldDef] of fields) {
    if (!fieldDef.validators?.length) continue;

    const value = data[fieldKey];
    const fieldErrors = validateField(value, fieldKey, fieldDef.validators);
    errors.push(...fieldErrors);
  }

  if (errors.length > 0) {
    throw new ValidationError(modelClassName, errors);
  }

  return { valid: true, errors: [] };
}

/**
 * Custom error class for validation failures.
 */
export class ValidationError extends Error {
  public modelClass: string;
  public errors: string[];

  constructor(modelClass: string, errors: string[]) {
    super(`Validation failed for ${modelClass}: ${errors.join('; ')}`);
    this.name = 'ValidationError';
    this.modelClass = modelClass;
    this.errors = errors;
  }
}
