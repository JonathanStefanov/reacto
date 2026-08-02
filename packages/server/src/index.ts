/**
 * @reacto/server — HTTP server with auto-generated API routes
 *
 * @example
 * ```ts
 * import { createServer } from '@reacto/server';
 *
 * const server = createServer();
 * server.listen(3000);
 * ```
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { getAllModels, autoConfigure } from '@reacto/core';
import { generateCrudRoutes } from './routes/crud.js';
import { errorHandler, notFoundHandler } from './middleware/errors.js';
import { requestLogger } from './middleware/logger.js';

export interface ServerOptions {
  cors?: cors.CorsOptions;
  rateLimit?: {
    windowMs?: number;
    max?: number;
  };
  helmet?: boolean;
  compression?: boolean;
  logger?: boolean;
  basePath?: string;
}

/**
 * Create a Reacto HTTP server with auto-generated CRUD routes.
 */
export function createServer(options: ServerOptions = {}): express.Express {
  // Auto-configure database from environment
  autoConfigure();

  const app = express();
  const basePath = options.basePath ?? '/api';

  // ─── Middleware ───────────────────────────────────────────────────────────

  if (options.helmet !== false) {
    app.use(helmet());
  }

  app.use(cors(options.cors));

  if (options.compression !== false) {
    app.use(compression());
  }

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  if (options.rateLimit) {
    app.use(
      rateLimit({
        windowMs: options.rateLimit.windowMs ?? 15 * 60 * 1000,
        max: options.rateLimit.max ?? 100,
      })
    );
  }

  if (options.logger !== false) {
    app.use(requestLogger);
  }

  // ─── Health check ────────────────────────────────────────────────────────

  app.get(`${basePath}/health`, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // ─── Auto-generate CRUD routes for all registered models ────────────────

  const models = getAllModels();
  for (const [name, modelClass] of models) {
    const routePath = `${basePath}/${modelClass.meta.tableName}`;
    const router = generateCrudRoutes(modelClass);
    app.use(routePath, router);
    console.log(`[Reacto] Routes mounted: ${routePath} (${name})`);
  }

  // ─── Error handling ──────────────────────────────────────────────────────

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

/**
 * Create and start the server.
 */
export async function startServer(port: number = 3000, options: ServerOptions = {}): Promise<express.Express> {
  const app = createServer(options);

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[Reacto] Server running on http://localhost:${port}`);
      resolve(app);
    });
  });
}

export { generateCrudRoutes } from './routes/crud.js';
export { errorHandler, notFoundHandler } from './middleware/errors.js';
export { requestLogger } from './middleware/logger.js';
