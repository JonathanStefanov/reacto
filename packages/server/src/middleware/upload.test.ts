import { describe, it, expect } from 'vitest';
import { validateFile } from './upload.js';
import type { UploadedFile } from './upload.js';

function createMockFile(overrides: Partial<UploadedFile> = {}): UploadedFile {
  return {
    fieldname: 'file',
    originalname: 'test.txt',
    encoding: '7bit',
    mimetype: 'text/plain',
    buffer: Buffer.from('hello'),
    size: 5,
    ...overrides,
  };
}

describe('upload middleware', () => {
  describe('validateFile', () => {
    it('passes for valid file with no restrictions', () => {
      const file = createMockFile();
      const errors = validateFile(file);
      expect(errors).toHaveLength(0);
    });

    it('passes for allowed MIME type', () => {
      const file = createMockFile({ mimetype: 'image/jpeg', size: 1024 });
      const errors = validateFile(file, {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
        maxSize: 5 * 1024 * 1024,
      });
      expect(errors).toHaveLength(0);
    });

    it('fails for disallowed MIME type', () => {
      const file = createMockFile({ mimetype: 'application/exe' });
      const errors = validateFile(file, {
        allowedMimeTypes: ['image/jpeg', 'image/png'],
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('application/exe');
      expect(errors[0]).toContain('not allowed');
    });

    it('fails when file exceeds max size', () => {
      const file = createMockFile({ size: 10 * 1024 * 1024 }); // 10MB
      const errors = validateFile(file, {
        maxSize: 5 * 1024 * 1024, // 5MB
      });
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('exceeds maximum');
    });

    it('returns multiple errors for multiple violations', () => {
      const file = createMockFile({
        mimetype: 'application/exe',
        size: 100 * 1024 * 1024,
      });
      const errors = validateFile(file, {
        allowedMimeTypes: ['image/jpeg'],
        maxSize: 1024,
      });
      expect(errors).toHaveLength(2);
    });

    it('handles empty allowedMimeTypes (all allowed)', () => {
      const file = createMockFile({ mimetype: 'application/pdf' });
      const errors = validateFile(file, {});
      expect(errors).toHaveLength(0);
    });
  });
});
