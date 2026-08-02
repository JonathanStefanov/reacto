import { describe, it, expect } from 'vitest';
import {
  required,
  minLength,
  maxLength,
  minValue,
  maxValue,
  pattern,
  email,
  url,
  oneOf,
  integer,
  positive,
  validateModel,
  ValidationError,
} from './index.js';

describe('validators', () => {
  describe('required', () => {
    it('fails for null', () => {
      const v = required();
      expect(v.validate(null, 'name')).toBe('name is required.');
    });

    it('fails for undefined', () => {
      const v = required();
      expect(v.validate(undefined, 'name')).toBe('name is required.');
    });

    it('fails for empty string', () => {
      const v = required();
      expect(v.validate('', 'name')).toBe('name is required.');
    });

    it('passes for valid value', () => {
      const v = required();
      expect(v.validate('hello', 'name')).toBeNull();
    });
  });

  describe('minLength', () => {
    it('fails for short string', () => {
      const v = minLength(3);
      expect(v.validate('ab', 'name')).toBe('name must be at least 3 characters.');
    });

    it('passes for valid length', () => {
      const v = minLength(3);
      expect(v.validate('abc', 'name')).toBeNull();
    });
  });

  describe('maxLength', () => {
    it('fails for long string', () => {
      const v = maxLength(5);
      expect(v.validate('abcdef', 'name')).toBe('name must be at most 5 characters.');
    });

    it('passes for valid length', () => {
      const v = maxLength(5);
      expect(v.validate('abc', 'name')).toBeNull();
    });
  });

  describe('minValue', () => {
    it('fails for value below min', () => {
      const v = minValue(18);
      expect(v.validate(17, 'age')).toBe('age must be at least 18.');
    });

    it('passes for value at min', () => {
      const v = minValue(18);
      expect(v.validate(18, 'age')).toBeNull();
    });
  });

  describe('maxValue', () => {
    it('fails for value above max', () => {
      const v = maxValue(100);
      expect(v.validate(101, 'score')).toBe('score must be at most 100.');
    });

    it('passes for value at max', () => {
      const v = maxValue(100);
      expect(v.validate(100, 'score')).toBeNull();
    });
  });

  describe('pattern', () => {
    it('fails for non-matching string', () => {
      const v = pattern(/^[a-z]+$/, 'Must be lowercase');
      expect(v.validate('ABC', 'name')).toBe('Must be lowercase');
    });

    it('passes for matching string', () => {
      const v = pattern(/^[a-z]+$/);
      expect(v.validate('abc', 'name')).toBeNull();
    });

    it('uses default message when not provided', () => {
      const v = pattern(/^[0-9]+$/);
      expect(v.validate('abc', 'code')).toBe('code does not match the required pattern.');
    });
  });

  describe('email', () => {
    it('fails for invalid email', () => {
      const v = email();
      expect(v.validate('not-an-email', 'email')).toBe('email must be a valid email address.');
    });

    it('passes for valid email', () => {
      const v = email();
      expect(v.validate('user@example.com', 'email')).toBeNull();
    });
  });

  describe('url', () => {
    it('fails for invalid url', () => {
      const v = url();
      expect(v.validate('not-a-url', 'website')).toBe('website must be a valid URL.');
    });

    it('passes for valid url', () => {
      const v = url();
      expect(v.validate('https://example.com', 'website')).toBeNull();
    });
  });

  describe('oneOf', () => {
    it('fails for disallowed value', () => {
      const v = oneOf('red', 'green', 'blue');
      expect(v.validate('yellow', 'color')).toBe('color must be one of: red, green, blue.');
    });

    it('passes for allowed value', () => {
      const v = oneOf('red', 'green', 'blue');
      expect(v.validate('red', 'color')).toBeNull();
    });
  });

  describe('integer', () => {
    it('fails for float', () => {
      const v = integer();
      expect(v.validate(1.5, 'count')).toBe('count must be an integer.');
    });

    it('passes for integer', () => {
      const v = integer();
      expect(v.validate(5, 'count')).toBeNull();
    });
  });

  describe('positive', () => {
    it('fails for zero', () => {
      const v = positive();
      expect(v.validate(0, 'amount')).toBe('amount must be a positive number.');
    });

    it('fails for negative', () => {
      const v = positive();
      expect(v.validate(-5, 'amount')).toBe('amount must be a positive number.');
    });

    it('passes for positive', () => {
      const v = positive();
      expect(v.validate(5, 'amount')).toBeNull();
    });
  });

  describe('validateModel', () => {
    it('returns errors for invalid data', () => {
      const fields = new Map([
        ['username', { validators: [required(), minLength(3)] }],
        ['email', { validators: [required(), email()] }],
      ]);

      const errors = validateModel({ username: '', email: 'bad' }, fields as any);
      expect(errors.username).toBeDefined();
      expect(errors.email).toBeDefined();
    });

    it('returns empty object for valid data', () => {
      const fields = new Map([
        ['username', { validators: [required(), minLength(3)] }],
        ['email', { validators: [required(), email()] }],
      ]);

      const errors = validateModel({ username: 'john', email: 'john@example.com' }, fields as any);
      expect(Object.keys(errors)).toHaveLength(0);
    });

    it('skips fields without validators', () => {
      const fields = new Map([
        ['username', {}],
        ['age', {}],
      ]);

      const errors = validateModel({ username: 'john', age: 25 }, fields as any);
      expect(Object.keys(errors)).toHaveLength(0);
    });
  });

  describe('ValidationError', () => {
    it('contains errors object', () => {
      const err = new ValidationError({ name: ['name is required.'] });
      expect(err.name).toBe('ValidationError');
      expect(err.errors.name).toEqual(['name is required.']);
    });
  });
});
