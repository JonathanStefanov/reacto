/**
 * @reacto/server — HTTP server with auto-generated API routes and WebSocket
 *
 * @example
 * ```ts
 * import { createServer } from '@reacto/server';
 *
 * const { app, server, ws } = createServer({ websocket: true });
 * server.listen(3000);
 * ```
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
import { ReactoWebSocketServer, enableAutoBroadcast } from './websocket/index.js';
import type { WebSocketServerOptions } from './websocket/index.js';

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
  /** Enable WebSocket server */
  websocket?: boolean | WebSocketServerOptions;
}

export interface ServerResult {
  app: express.Express;
  server: ReturnType<typeof createHttpServer>;
  ws: ReactoWebSocketServer | null;
}

/**
 * Create a Reacto HTTP server with auto-generated CRUD routes and optional WebSocket.
 */
export function createServer(options: ServerOptions = {}): ServerResult {
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

  // ─── HTTP Server + WebSocket ─────────────────────────────────────────────

  const server = createHttpServer(app);
  let ws: ReactoWebSocketServer | null = null;

  if (options.websocket) {
    const wsOptions = typeof options.websocket === 'object' ? options.websocket : {};
    ws = new ReactoWebSocketServer(server, wsOptions);

    // Auto-broadcast model changes
    for (const [, modelClass] of models) {
      enableAutoBroadcast(modelClass);
      console.log(`[Reacto WS] Auto-broadcasting: ${modelClass.tableName}`);
    }
  }

  return { app, server, ws };
}

/**
 * Create and start the server.
 */
export async function startServer(port: number = 3000, options: ServerOptions = {}): Promise<ServerResult> {
  const result = createServer(options);

  return new Promise((resolve) => {
    result.server.listen(port, () => {
      console.log(`[Reacto] Server running on http://localhost:${port}`);
      if (result.ws) {
        console.log(`[Reacto] WebSocket running on ws://localhost:${port}/ws`);
      }
      resolve(result);
    });
  });
}

export { generateCrudRoutes } from './routes/crud.js';
export { errorHandler, notFoundHandler } from './middleware/errors.js';
export { requestLogger } from './middleware/logger.js';
export {
  authMiddleware,
  requireAuth,
  optionalAuth,
  requireProperty,
  signJwt,
  verifyJwt,
} from './middleware/auth.js';
export type { AuthConfig, JwtPayload } from './middleware/auth.js';
export {
  ReactoWebSocketServer,
  createWebSocketServer,
  attachWebSocket,
  getWebSocketServer,
  enableAutoBroadcast,
} from './websocket/index.js';
export type { WsMessage, WsBroadcast, WsClient, WebSocketServerOptions } from './websocket/index.js';
