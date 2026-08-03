/**
 * Reacto Server — File Upload Routes
 */
import { Router, Request, Response, NextFunction } from 'express';
import { getDefaultStorage, LocalStorage } from '@reacto-org/core';
import { uploadMiddleware, validateFile } from '../middleware/upload.js';
import type { UploadedFile } from '../middleware/upload.js';

export function createFileRoutes(options: {
  allowedMimeTypes?: string[];
  maxSize?: number;
  subDir?: string;
  requireAuth?: (req: Request, res: Response, next: NextFunction) => void;
} = {}): Router {
  const router = Router();
  const storage = getDefaultStorage();

  // POST /files/upload
  const handlers: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
  if (options.requireAuth) handlers.push(options.requireAuth);
  handlers.push(
    uploadMiddleware({
      maxSize: options.maxSize,
      allowedMimeTypes: options.allowedMimeTypes,
      fieldName: 'file',
    })
  );
  handlers.push(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const files = (req as Request & { files?: UploadedFile[] }).files;
      if (!files?.length) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = files[0];
      const errors = validateFile(file, {
        allowedMimeTypes: options.allowedMimeTypes,
        maxSize: options.maxSize,
      });

      if (errors.length > 0) {
        return res.status(400).json({ error: 'Validation failed', details: errors });
      }

      const stored = await storage.store(file.buffer, file.originalname, file.mimetype, options.subDir);
      res.status(201).json({ data: stored });
    } catch (err) {
      next(err);
    }
  });

  router.post('/upload', ...handlers);

  // GET /files/:filename — Serve a file (local storage only)
  router.get('/:filename', (req: Request, res: Response) => {
    const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
    const filePath = options.subDir ? `/${options.subDir}/${filename}` : `/${filename}`;

    if (storage instanceof LocalStorage) {
      if (storage.exists(filePath)) {
        const buffer = storage.read(filePath);
        const ext = (filename as string).split('.').pop()?.toLowerCase() ?? '';
        const mimeTypes: Record<string, string> = {
          jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
          webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf', txt: 'text/plain',
        };
        res.setHeader('Content-Type', mimeTypes[ext] ?? 'application/octet-stream');
        res.send(buffer);
      } else {
        res.status(404).json({ error: 'File not found' });
      }
    } else {
      res.status(400).json({ error: 'File serving not supported for S3 storage' });
    }
  });

  // DELETE /files/:filename
  const deleteHandlers: Array<(req: Request, res: Response, next: NextFunction) => void> = [];
  if (options.requireAuth) deleteHandlers.push(options.requireAuth);
  deleteHandlers.push(async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filename = Array.isArray(req.params.filename) ? req.params.filename[0] : req.params.filename;
      const filePath = options.subDir ? `/${options.subDir}/${filename}` : `/${filename}`;
      await storage.delete(filePath);
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:filename', ...deleteHandlers);

  return router;
}
