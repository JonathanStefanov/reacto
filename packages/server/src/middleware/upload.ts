/**
 * Reacto Server — File Upload Middleware
 *
 * Handles multipart/form-data file uploads using busboy (no native deps).
 */
import type { Request, Response, NextFunction } from 'express';
import type { StoredFile } from '@reacto/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UploadOptions {
  /** Max file size in bytes. Default: 10MB */
  maxSize?: number;
  /** Allowed MIME types. Default: all */
  allowedMimeTypes?: string[];
  /** Max number of files. Default: 1 */
  maxCount?: number;
  /** Field name for the file */
  fieldName?: string;
}

export interface UploadedFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
}

// ─── Parse multipart form data ────────────────────────────────────────────────

/**
 * Parse multipart/form-data and attach files to req.files.
 * Uses busboy for streaming parsing (no native deps).
 */
export function uploadMiddleware(options: UploadOptions = {}) {
  const maxSize = options.maxSize ?? 10 * 1024 * 1024; // 10MB
  const allowedMimeTypes = options.allowedMimeTypes;
  const maxCount = options.maxCount ?? 1;
  const fieldName = options.fieldName ?? 'file';

  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const contentType = req.headers['content-type'] ?? '';

    if (!contentType.includes('multipart/form-data')) {
      next();
      return;
    }

    try {
      const busboy = await import('busboy');
      const bb = busboy.default({
        headers: req.headers,
        limits: { fileSize: maxSize, files: maxCount },
      });

      const files: UploadedFile[] = [];
      const fields: Record<string, string> = {};

      bb.on('file', (fieldname, file, info) => {
        const { filename, encoding, mimeType } = info;

        // Check MIME type
        if (allowedMimeTypes && !allowedMimeTypes.includes(mimeType)) {
          file.resume(); // Skip this file
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;

        file.on('data', (data: Buffer) => {
          totalSize += data.length;
          if (totalSize > maxSize) {
            file.resume(); // Abort
            return;
          }
          chunks.push(data);
        });

        file.on('end', () => {
          files.push({
            fieldname,
            originalname: filename,
            encoding,
            mimetype: mimeType,
            buffer: Buffer.concat(chunks),
            size: totalSize,
          });
        });
      });

      bb.on('field', (name: string, value: string) => {
        fields[name] = value;
      });

      bb.on('finish', () => {
        (req as Request & { files?: UploadedFile[] }).files = files;
        (req as Request & { body: Record<string, string> }).body = {
          ...req.body,
          ...fields,
        };
        next();
      });

      bb.on('error', (err: Error) => {
        next(err);
      });

      // Pipe request to busboy
      req.pipe(bb);
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Parse multipart and store files using the configured storage backend.
 */
export function uploadAndStore(options: UploadOptions & { subDir?: string } = {}) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const contentType = req.headers['content-type'] ?? '';

    if (!contentType.includes('multipart/form-data')) {
      next();
      return;
    }

    try {
      const { getDefaultStorage } = await import('@reacto/core');
      const storage = getDefaultStorage();

      const busboy = await import('busboy');
      const bb = busboy.default({
        headers: req.headers,
        limits: { fileSize: options.maxSize ?? 10 * 1024 * 1024, files: options.maxCount ?? 1 },
      });

      const files: StoredFile[] = [];
      const fields: Record<string, string> = {};

      bb.on('file', (_fieldname, file, info) => {
        const { filename, mimeType } = info;

        if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(mimeType)) {
          file.resume();
          return;
        }

        const chunks: Buffer[] = [];
        let totalSize = 0;
        const maxSize = options.maxSize ?? 10 * 1024 * 1024;

        file.on('data', (data: Buffer) => {
          totalSize += data.length;
          if (totalSize > maxSize) {
            file.resume();
            return;
          }
          chunks.push(data);
        });

        file.on('end', async () => {
          const buffer = Buffer.concat(chunks);
          const stored = await storage.store(buffer, filename, mimeType, options.subDir);
          files.push(stored);
        });
      });

      bb.on('field', (name: string, value: string) => {
        fields[name] = value;
      });

      bb.on('finish', () => {
        (req as Request & { storedFiles?: StoredFile[] }).storedFiles = files;
        (req as Request & { body: Record<string, string> }).body = {
          ...req.body,
          ...fields,
        };
        next();
      });

      bb.on('error', (err: Error) => next(err));

      req.pipe(bb);
    } catch (err) {
      next(err);
    }
  };
}

// ─── File validation helper ───────────────────────────────────────────────────

export function validateFile(
  file: UploadedFile,
  options: { allowedMimeTypes?: string[]; maxSize?: number } = {}
): string[] {
  const errors: string[] = [];

  if (options.allowedMimeTypes && !options.allowedMimeTypes.includes(file.mimetype)) {
    errors.push(`File type "${file.mimetype}" is not allowed. Allowed: ${options.allowedMimeTypes.join(', ')}`);
  }

  if (options.maxSize && file.size > options.maxSize) {
    const maxMB = (options.maxSize / (1024 * 1024)).toFixed(1);
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    errors.push(`File size ${actualMB}MB exceeds maximum of ${maxMB}MB`);
  }

  return errors;
}
