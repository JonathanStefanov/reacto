/**
 * @reacto/server — HTTP server with auto-generated API routes
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { createServer as createHttpServer } from 'http';
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

export interface ServerResult {
  app: express.Express;
  server: ReturnType<typeof createHttpServer>;
}

/**
 * Create a Reacto HTTP server with auto-generated CRUD routes.
 */
export function createServer(options: ServerOptions = {}): ServerResult {
  autoConfigure();

  const app = express();
  const basePath = options.basePath ?? '/api';

  if (options.helmet !== false) app.use(helmet());
  app.use(cors(options.cors));
  if (options.compression !== false) app.use(compression());
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

  if (options.logger !== false) app.use(requestLogger);

  app.get(`${basePath}/health`, (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  const models = getAllModels();
  for (const [name, modelClass] of models) {
    const routePath = `${basePath}/${modelClass.meta.tableName}`;
    const router = generateCrudRoutes(modelClass);
    app.use(routePath, router);
    console.log(`[Reacto] Routes mounted: ${routePath} (${name})`);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  const server = createHttpServer(app);

  return { app, server };
}

export async function startServer(port = 3000, options: ServerOptions = {}): Promise<ServerResult> {
  const result = createServer(options);
  return new Promise((resolve) => {
    result.server.listen(port, () => {
      console.log(`[Reacto] Server running on http://localhost:${port}`);
      resolve(result);
    });
  });
}

export { generateCrudRoutes } from './routes/crud.js';
export { errorHandler, notFoundHandler } from './middleware/errors.js';
export { requestLogger } from './middleware/logger.js';
export { authMiddleware, requireRole, signJwt, verifyJwt, hashPassword, verifyPassword } from './middleware/auth.js';
export type { JwtPayload, AuthOptions } from './middleware/auth.js';
