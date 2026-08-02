/**
 * Reacto — Field Validators
 *
 * Built-in validators for model fields:
 *
 *   @Field({ type: 'string', validators: [required(), minLength(3), maxLength(150)] })
 *   username: string;
 */
import type { Validator } from '../types.js';

// ─── Built-in Validators ─────────────────────────────────────────────────────

export function required(): Validator {
  return {
    name: 'required',
    validate(value: unknown, fieldName: string): string | null {
      if (value === null || value === undefined || value === '') {
        return `${fieldName} is required.`;
      }
      return null;
    },
  };
}

export function minLength(min: number): Validator {
  return {
    name: 'minLength',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'string' && value.length < min) {
        return `${fieldName} must be at least ${min} characters.`;
      }
      return null;
    },
  };
}

export function maxLength(max: number): Validator {
  return {
    name: 'maxLength',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'string' && value.length > max) {
        return `${fieldName} must be at most ${max} characters.`;
      }
      return null;
    },
  };
}

export function minValue(min: number): Validator {
  return {
    name: 'minValue',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'number' && value < min) {
        return `${fieldName} must be at least ${min}.`;
      }
      return null;
    },
  };
}

export function maxValue(max: number): Validator {
  return {
    name: 'maxValue',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'number' && value > max) {
        return `${fieldName} must be at most ${max}.`;
      }
      return null;
    },
  };
}

export function email(): Validator {
  return {
    name: 'email',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${fieldName} must be a valid email address.`;
      }
      return null;
    },
  };
}

export function url(): Validator {
  return {
    name: 'url',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'string') {
        try {
          new URL(value);
        } catch {
          return `${fieldName} must be a valid URL.`;
        }
      }
      return null;
    },
  };
}

export function pattern(regex: RegExp, message?: string): Validator {
  return {
    name: 'pattern',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'string' && !regex.test(value)) {
        return message ?? `${fieldName} does not match the required pattern.`;
      }
      return null;
    },
  };
}

export function oneOf(...allowed: unknown[]): Validator {
  return {
    name: 'oneOf',
    validate(value: unknown, fieldName: string): string | null {
      if (!allowed.includes(value)) {
        return `${fieldName} must be one of: ${allowed.join(', ')}.`;
      }
      return null;
    },
  };
}

export function integer(): Validator {
  return {
    name: 'integer',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'number' && !Number.isInteger(value)) {
        return `${fieldName} must be an integer.`;
      }
      return null;
    },
  };
}

export function positive(): Validator {
  return {
    name: 'positive',
    validate(value: unknown, fieldName: string): string | null {
      if (typeof value === 'number' && value <= 0) {
        return `${fieldName} must be a positive number.`;
      }
      return null;
    },
  };
}

// ─── Validation Runner ───────────────────────────────────────────────────────

export class ValidationError extends Error {
  errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>) {
    super('Validation failed');
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

/**
 * Validate a model instance against its field validators.
 * Returns errors object or throws ValidationError.
 */
export function validateModel(instance: Record<string, unknown>, fields: Map<string, { validators?: Validator[]; verboseName?: string }>): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  for (const [propertyKey, fieldDef] of fields) {
    if (!fieldDef.validators?.length) continue;

    const value = instance[propertyKey];
    const fieldErrors: string[] = [];

    for (const validator of fieldDef.validators) {
      const error = validator.validate(value, fieldDef.verboseName ?? propertyKey);
      if (error) {
        fieldErrors.push(error);
      }
    }

    if (fieldErrors.length > 0) {
      errors[propertyKey] = fieldErrors;
    }
  }

  return errors;
}
