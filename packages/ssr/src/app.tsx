/**
 * createSSRApp — creates an Express app with SSR support.
 *
 * Combines server rendering, session auth, and API routes.
 */
import express, { type Express, type Request, type Response } from 'express';
import { createServer as createHttpServer, type Server } from 'http';
import cookieParser from 'cookie-parser';
import {
  configureDatabase,
  configureCache,
  configureTaskQueue,
  getAllModels,
  ModelManager,
  autoConfigure,
} from '@reacto-org/core';
import {
  createServer as createAPIServer,
  type ServerOptions,
} from '@reacto-org/server';
import { createSessionMiddleware, type SessionOptions, type RequestWithSession } from './session.js';
import { renderToHTML, type RenderOptions } from './render.js';
import type { ServerContext } from './context.js';
import type React from 'react';

export interface SSRAppOptions {
  /** Database configuration */
  database?: Parameters<typeof configureDatabase>[0];
  /** Cache configuration */
  cache?: Parameters<typeof configureCache>[0];
  /** Session configuration */
  session: SessionOptions;
  /** API server options */
  api?: ServerOptions;
  /** Base path for SSR routes (default: '/') */
  basePath?: string;
  /** Static file directories */
  static?: string[];
  /** Port (default: 3000) */
  port?: number;
}

export interface SSRAppResult {
  app: Express;
  server: Server;
  /** Register an SSR page route */
  page: (path: string, component: React.FC, options?: Partial<RenderOptions>) => void;
  /** Start the server */
  start: (port?: number) => Promise<void>;
}

/**
 * Create a Reacto SSR application.
 *
 *   const app = createSSRApp({
 *     session: { secret: 'my-secret' },
 *   });
 *
 *   // Register server-rendered pages
 *   app.page('/', HomePage);
 *   app.page('/movies', MovieList);
 *   app.page('/movies/:id', MovieDetail);
 *
 *   await app.start(3000);
 */
export function createSSRApp(options: SSRAppOptions): SSRAppResult {
  // Configure core
  autoConfigure();

  const app = express();
  const basePath = options.basePath ?? '/';

  // ─── Middleware ──────────────────────────────────────────────────────

  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware
  app.use(createSessionMiddleware(options.session));

  // Static files
  if (options.static) {
    for (const dir of options.static) {
      app.use(express.static(dir));
    }
  }

  // ─── API Routes ─────────────────────────────────────────────────────

  // Mount API server for data endpoints (chat, search, etc.)
  const { app: apiApp, server: apiServer, ws } = createAPIServer(options.api);
  app.use(`${basePath}api`, apiApp);

  // ─── SSR Page Registration ──────────────────────────────────────────

  const pages: Array<{
    path: string;
    component: React.FC;
    options: Partial<RenderOptions>;
  }> = [];

  /**
   * Register an SSR page route.
   *
   *   app.page('/', HomePage);
   *   app.page('/movies/:id', MovieDetail, { title: 'Movie Detail' });
   */
  const page = (
    path: string,
    component: React.FC,
    pageOptions: Partial<RenderOptions> = {}
  ) => {
    pages.push({ path, component, options: pageOptions });

    // Convert path pattern to Express route
    const routePath = basePath === '/' ? path : `${basePath}${path}`;

    app.get(routePath, async (req: Request, res: Response) => {
      try {
        const session = (req as RequestWithSession).session;

        // Build server context
        const context: ServerContext = {
          req,
          user: session
            ? { id: session.userId, email: session.email, username: session.username }
            : null,
          flash: (type: string, message: string) => {
            // Simple flash via cookie
            res.cookie(`flash_${type}`, message, { maxAge: 5000 });
          },
          path: req.path,
          query: req.query as Record<string, string>,
        };

        // Extract route params
        const params = req.params;
        const props = { ...params, ...req.query };

        // Render the component
        const element = await renderComponent(component, context, props);

        // Render to HTML
        const html = await renderToHTML(element, {
          context,
          title: pageOptions.title || 'Reacto App',
          head: pageOptions.head || '',
          bodyClass: pageOptions.bodyClass || '',
          ...pageOptions,
        });

        res.type('html').send(html);
      } catch (error) {
        console.error(`[SSR] Error rendering ${path}:`, error);
        res.status(500).send('Internal Server Error');
      }
    });
  };

  // ─── Server Creation ────────────────────────────────────────────────

  const server = createHttpServer(app);

  /**
   * Start the server.
   */
  const start = async (port?: number) => {
    const p = port || options.port || 3000;
    return new Promise<void>((resolve) => {
      server.listen(p, () => {
        console.log(`[Reacto SSR] Server running on http://localhost:${p}`);
        if (ws) {
          console.log(`[Reacto SSR] WebSocket available at ws://localhost:${p}/ws`);
        }
        resolve();
      });
    });
  };

  return { app, server, page, start };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function renderComponent(
  component: React.FC,
  context: ServerContext,
  props: Record<string, unknown>
): Promise<React.ReactElement> {
  // Check if it's a server component (has fn property)
  if ('fn' in component && typeof component.fn === 'function') {
    const element = await (component as any).fn(context, props);
    return element;
  }

  // Regular component
  return React.createElement(component, props);
}
