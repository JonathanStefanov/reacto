/**
 * @reacto-org/ssr — Server-Side Rendering Engine
 *
 * Renders React components on the server using models/auth directly.
 * Sends HTML to the browser. Client JS only for interactivity.
 */
import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import { createServer as createHttpServer, type Server } from 'http';
import cookieParser from 'cookie-parser';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createHash, randomBytes } from 'crypto';
import {
  autoConfigure,
  getAllModels,
  ModelManager,
} from '@reacto-org/core';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ServerContext {
  req: Request;
  user: { id: number; email: string; username: string } | null;
  path: string;
  query: Record<string, string>;
  params: Record<string, string>;
  flash: (type: string, msg: string) => void;
}

export type ServerComponentFn = (
  ctx: ServerContext,
  props: Record<string, unknown>
) => Promise<React.ReactElement>;

export interface SSRAppOptions {
  secret: string;
  maxAge?: number;
  static?: string[];
  port?: number;
}

// ─── Session Store ────────────────────────────────────────────────────────────

interface SessionData {
  userId: number;
  email: string;
  username: string;
}

const sessions = new Map<string, { data: SessionData; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) {
    if (now > s.expiresAt) sessions.delete(id);
  }
}, 60_000);

function createSessionId(secret: string): string {
  const rand = randomBytes(32).toString('hex');
  const sig = createHash('sha256').update(rand + secret).digest('hex').slice(0, 16);
  return `${rand}.${sig}`;
}

// ─── Server Component Helper ──────────────────────────────────────────────────

interface ServerComponentMeta {
  __server: true;
  fn: ServerComponentFn;
  name: string;
}

const serverComponentRegistry = new Map<string, ServerComponentMeta>();

/**
 * Create a server component.
 *
 *   const HomePage = serverComponent(async (ctx) => {
 *     const movies = await ModelManager.objects(Movie).all();
 *     return <div>{movies.map(m => <p>{m.title}</p>)}</div>;
 *   }, 'HomePage');
 */
export function serverComponent(
  fn: ServerComponentFn,
  name?: string
): React.FC<Record<string, unknown>> & ServerComponentMeta {
  const meta: ServerComponentMeta = {
    __server: true,
    fn,
    name: name || fn.name || 'Page',
  };

  serverComponentRegistry.set(meta.name, meta);

  // Return a placeholder component (actual rendering happens in the SSR engine)
  const Component = (() => {
    return React.createElement('div', { 'data-ssr-placeholder': meta.name });
  }) as unknown as React.FC<Record<string, unknown>> & ServerComponentMeta;

  Object.assign(Component, meta);
  return Component;
}

// ─── SSR App ─────────────────────────────────────────────────────────────────

export interface SSRAppResult {
  app: Express;
  server: Server;
  page: (path: string, component: ServerComponentMeta | ServerComponentFn, opts?: { title?: string }) => void;
  start: (port?: number) => Promise<void>;
}

/**
 * Create an SSR application.
 *
 *   const app = createSSRApp({ secret: 'my-secret' });
 *   app.page('/', HomePage);
 *   app.start(3000);
 */
export function createSSRApp(options: SSRAppOptions): SSRAppResult {
  autoConfigure();

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware
  const cookieName = 'reacto_session';
  const maxAge = options.maxAge ?? 7 * 24 * 60 * 60;

  app.use((req: Request, _res: Response, next: NextFunction) => {
    const sid = (req.cookies as Record<string, string>)?.[cookieName];
    if (sid) {
      const session = sessions.get(sid);
      if (session && Date.now() < session.expiresAt) {
        (req as any).session = session.data;
        (req as any).sessionId = sid;
      }
    }

    (req as any).login = (user: SessionData) => {
      const id = createSessionId(options.secret);
      sessions.set(id, { data: user, expiresAt: Date.now() + maxAge * 1000 });
      _res.cookie(cookieName, id, { httpOnly: true, maxAge: maxAge * 1000, sameSite: 'lax' });
      (req as any).session = user;
    };

    (req as any).logout = () => {
      const sid = (req as any).sessionId;
      if (sid) sessions.delete(sid);
      _res.clearCookie(cookieName);
      (req as any).session = undefined;
    };

    next();
  });

  // Static files
  if (options.static) {
    for (const dir of options.static) {
      app.use(express.static(dir));
    }
  }

  // ─── Page Registration ──────────────────────────────────────────────

  const page = (
    path: string,
    component: ServerComponentMeta | ServerComponentFn,
    opts?: { title?: string }
  ) => {
    const meta: ServerComponentMeta = '__server' in component
      ? component as ServerComponentMeta
      : { __server: true, fn: component as ServerComponentFn, name: path };

    app.get(path, async (req: Request, res: Response) => {
      try {
        const session = (req as any).session as SessionData | undefined;

        const ctx: ServerContext = {
          req,
          user: session ? { id: session.userId, email: session.email, username: session.username } : null,
          path: req.path,
          query: req.query as Record<string, string>,
          params: req.params as Record<string, string>,
          flash: () => {},
        };

        // Execute the server component
        const element = await meta.fn(ctx, { ...req.params, ...req.query });

        // Render to HTML string
        const bodyHtml = renderToString(element);

        // Build full page
        const pageHtml = buildPage(bodyHtml, opts?.title || 'Reacto App');

        res.type('html').send(pageHtml);
      } catch (error) {
        console.error(`[SSR] Error rendering ${path}:`, error);
        res.status(500).type('html').send(buildPage(
          `<div style="padding:40px;color:#e74c3c;font-family:monospace">
            <h1>500 — Server Error</h1>
            <pre>${escapeHtml((error as Error).message)}</pre>
          </div>`,
          'Error'
        ));
      }
    });
  };

  // ─── 404 Handler ────────────────────────────────────────────────────

  app.use((_req: Request, res: Response) => {
    res.status(404).type('html').send(buildPage(
      `<div style="padding:40px;text-align:center">
        <h1>404 — Not Found</h1>
        <p><a href="/">Go home</a></p>
      </div>`,
      'Not Found'
    ));
  });

  // ─── Server ─────────────────────────────────────────────────────────

  const server = createHttpServer(app);

  const start = async (port?: number) => {
    const p = port || options.port || 3000;
    return new Promise<void>((resolve) => {
      server.listen(p, () => {
        console.log(`[Reacto SSR] http://localhost:${p}`);
        resolve();
      });
    });
  };

  return { app, server, page, start };
}

// ─── HTML Builder ─────────────────────────────────────────────────────────────

function buildPage(bodyHtml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${bodyHtml}
  <script src="/client.js"></script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
