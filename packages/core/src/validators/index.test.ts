import { describe, it, expect } from 'vitest';
import {
  required,
  minLength,
  maxLength,
  min,
  max,
  pattern,
  email,
  url,
  oneOf,
  custom,
  validateField,
  validateModel,
  ValidationError,
} from './index.js';

describe('validators', () => {
  describe('required', () => {
    it('fails for null', () => {
      const v = required();
      expect(v.validate(null, 'name')).toBe('name is required');
    });

    it('fails for undefined', () => {
      const v = required();
      expect(v.validate(undefined, 'name')).toBe('name is required');
    });

    it('fails for empty string', () => {
      const v = required();
      expect(v.validate('', 'name')).toBe('name is required');
    });

    it('passes for valid value', () => {
      const v = required();
      expect(v.validate('hello', 'name')).toBeNull();
    });
  });

  describe('minLength', () => {
    it('fails for short string', () => {
      const v = minLength(3);
      expect(v.validate('ab', 'name')).toBe('name must be at least 3 characters');
    });

    it('passes for valid length', () => {
      const v = minLength(3);
      expect(v.validate('abc', 'name')).toBeNull();
    });

    it('passes for longer string', () => {
      const v = minLength(3);
      expect(v.validate('abcdef', 'name')).toBeNull();
    });
  });

  describe('maxLength', () => {
    it('fails for long string', () => {
      const v = maxLength(5);
      expect(v.validate('abcdef', 'name')).toBe('name must be at most 5 characters');
    });

    it('passes for valid length', () => {
      const v = maxLength(5);
      expect(v.validate('abc', 'name')).toBeNull();
    });
  });

  describe('min', () => {
    it('fails for value below min', () => {
      const v = min(18);
      expect(v.validate(17, 'age')).toBe('age must be at least 18');
    });

    it('passes for value at min', () => {
      const v = min(18);
      expect(v.validate(18, 'age')).toBeNull();
    });

    it('passes for value above min', () => {
      const v = min(18);
      expect(v.validate(25, 'age')).toBeNull();
    });
  });

  describe('max', () => {
    it('fails for value above max', () => {
      const v = max(100);
      expect(v.validate(101, 'score')).toBe('score must be at most 100');
    });

    it('passes for value at max', () => {
      const v = max(100);
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
      expect(v.validate('abc', 'code')).toBe('code is not in a valid format');
    });
  });

  describe('email', () => {
    it('fails for invalid email', () => {
      const v = email();
      expect(v.validate('not-an-email', 'email')).toBe('Must be a valid email address');
    });

    it('passes for valid email', () => {
      const v = email();
      expect(v.validate('user@example.com', 'email')).toBeNull();
    });
  });

  describe('url', () => {
    it('fails for invalid url', () => {
      const v = url();
      expect(v.validate('not-a-url', 'website')).toBe('Must be a valid URL');
    });

    it('passes for valid url', () => {
      const v = url();
      expect(v.validate('https://example.com', 'website')).toBeNull();
    });
  });

  describe('oneOf', () => {
    it('fails for disallowed value', () => {
      const v = oneOf(['red', 'green', 'blue']);
      expect(v.validate('yellow', 'color')).toBe('color must be one of: red, green, blue');
    });

    it('passes for allowed value', () => {
      const v = oneOf(['red', 'green', 'blue']);
      expect(v.validate('red', 'color')).toBeNull();
    });
  });

  describe('custom', () => {
    it('calls the custom function', () => {
      const v = custom((value) => {
        if (typeof value === 'string' && value.includes('bad')) {
          return 'Contains forbidden word';
        }
        return null;
      });

      expect(v.validate('this is bad', 'content')).toBe('Contains forbidden word');
      expect(v.validate('this is good', 'content')).toBeNull();
    });
  });

  describe('validateField', () => {
    it('runs multiple validators', () => {
      const errors = validateField('', 'name', [required(), minLength(3)]);
      expect(errors.length).toBe(2);
    });

    it('returns empty array for valid value', () => {
      const errors = validateField('hello', 'name', [required(), minLength(3)]);
      expect(errors.length).toBe(0);
    });
  });

  describe('validateModel', () => {
    it('throws ValidationError for invalid data', () => {
      const fields = new Map([
        ['username', { validators: [required(), minLength(3)] }],
        ['email', { validators: [required(), email()] }],
      ]);

      expect(() => {
        validateModel({ username: '', email: 'bad' }, fields as any, 'User');
      }).toThrow(ValidationError);
    });

    it('collects all errors', () => {
      const fields = new Map([
        ['username', { validators: [required(), minLength(3)] }],
        ['email', { validators: [required(), email()] }],
      ]);

      try {
        validateModel({ username: '', email: 'bad' }, fields as any, 'User');
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e).toBeInstanceOf(ValidationError);
        if (e instanceof ValidationError) {
          expect(e.errors.length).toBeGreaterThan(0);
          expect(e.modelClass).toBe('User');
        }
      }
    });

    it('passes for valid data', () => {
      const fields = new Map([
        ['username', { validators: [required(), minLength(3)] }],
        ['email', { validators: [required(), email()] }],
      ]);

      const result = validateModel(
        { username: 'john', email: 'john@example.com' },
        fields as any,
        'User'
      );
      expect(result.valid).toBe(true);
    });

    it('skips fields without validators', () => {
      const fields = new Map([
        ['username', {}],
        ['age', {}],
      ]);

      const result = validateModel({ username: 'john', age: 25 }, fields as any, 'User');
      expect(result.valid).toBe(true);
    });
  });
});
