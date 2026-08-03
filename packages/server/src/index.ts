/**
 * @reacto/server — HTTP server with auto-generated API routes + WebSocket
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
import { ReactoWebSocketServer } from './websocket/index.js';
import type { WebSocketServerOptions } from './websocket/index.js';
import { createAdminRoutes, generateAdminHtml } from './admin/index.js';
import { createTaskAdminRoutes } from '@reacto/core';

export interface ServerOptions {
  cors?: cors.CorsOptions;
  rateLimit?: { windowMs?: number; max?: number };
  helmet?: boolean;
  compression?: boolean;
  logger?: boolean;
  basePath?: string;
  /** Enable WebSocket server */
  websocket?: boolean | WebSocketServerOptions;
  /** Enable admin dashboard at /admin (default: true) */
  admin?: boolean;
}

export interface ServerResult {
  app: express.Express;
  server: ReturnType<typeof createHttpServer>;
  ws: ReactoWebSocketServer | null;
}

/**
 * Create a Reacto HTTP server with auto-generated CRUD routes + optional WebSocket.
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

  // Admin dashboard
  if (options.admin !== false) {
    app.use(`${basePath}/_admin`, createAdminRoutes());
    app.use(`${basePath}/_admin/tasks`, createTaskAdminRoutes());
    app.get('/admin', (_req, res) => {
      res.type('html').send(generateAdminHtml(basePath));
    });
    console.log('[Reacto] Admin dashboard: /admin');
  }

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

  // WebSocket
  let ws: ReactoWebSocketServer | null = null;
  if (options.websocket) {
    const wsOptions = typeof options.websocket === 'object' ? options.websocket : {};
    ws = new ReactoWebSocketServer(server, wsOptions);
    console.log(`[Reacto] WebSocket running on ws://localhost:${wsOptions.path ?? '/ws'}`);
  }

  return { app, server, ws };
}

export async function startServer(port = 3000, options: ServerOptions = {}): Promise<ServerResult> {
  const result = createServer(options);
  return new Promise((resolve) => {
    result.server.listen(port, () => {
      console.log(`[Reacto] Server running on http://localhost:${port}`);
      if (result.ws) console.log(`[Reacto] WebSocket available at ws://localhost:${port}/ws`);
      resolve(result);
    });
  });
}

export { generateCrudRoutes } from './routes/crud.js';
export { errorHandler, notFoundHandler } from './middleware/errors.js';
export { requestLogger } from './middleware/logger.js';
export { authMiddleware, requireRole, signJwt, verifyJwt, hashPassword, verifyPassword } from './middleware/auth.js';
export type { JwtPayload, AuthOptions } from './middleware/auth.js';
export { ReactoWebSocketServer, attachWebSocket, getWebSocketServer } from './websocket/index.js';
export type { WsMessage, WsBroadcast, WsClient, WebSocketServerOptions } from './websocket/index.js';
export { uploadMiddleware, uploadAndStore, validateFile } from './middleware/upload.js';
export type { UploadOptions, UploadedFile } from './middleware/upload.js';
export { createFileRoutes } from './routes/files.js';
export { createAdminRoutes, generateAdminHtml } from './admin/index.js';
