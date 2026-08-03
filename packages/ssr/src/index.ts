/**
 * @reacto-org/ssr — Batteries-included SSR framework
 *
 * Django-style: just create files in models/, views/, routes/, tasks/.
 * The framework auto-discovers everything.
 *
 * @example
 *   // server.ts — that's it. That's the whole file.
 *   import { createSSRApp } from '@reacto-org/ssr';
 *   createSSRApp();
 *
 *   // views/HomePage.tsx — auto-discovered, auto-mounted at /
 *   import { serverComponent, ModelManager } from '@reacto-org/ssr';
 *   import { Movie } from '../models/index.js';
 *
 *   export default serverComponent(async (ctx) => {
 *     const movies = await ModelManager.objects(Movie).all();
 *     return <div>{movies.map(m => <p key={m.id}>{m.title}</p>)}</div>;
 *   });
 */
import express, { type Express, type Request, type Response } from 'express';
import { createServer, type Server } from 'http';
import cookieParser from 'cookie-parser';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { createHash, randomBytes } from 'crypto';
import { readdir } from 'fs/promises';
import { join, resolve } from 'path';
import {
  configureDatabase,
  configureCache,
  autoConfigure,
  ModelManager,
  type ModelClass,
} from '@reacto-org/core';

// ─── Re-exports (single import point) ────────────────────────────────────────

export { ModelManager, configureDatabase, configureCache } from '@reacto-org/core';
export type { ModelClass } from '@reacto-org/core';

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
) => Promise<React.ReactElement> | React.ReactElement;

export interface ServerComponentMeta {
  __server: true;
  fn: ServerComponentFn;
  name: string;
  path?: string; // URL path override
}

export interface SSRConfig {
  /** Session secret (default: auto-generated) */
  secret?: string;
  /** Session max age in seconds (default: 7 days) */
  maxAge?: number;
  /** Database config (default: env vars) */
  database?: {
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
  };
  /** Cache config */
  cache?: { maxSize?: number; defaultTtl?: number };
  /** Port (default: 3000) */
  port?: number;
  /** Static file directories (default: ['./public']) */
  static?: string[];
  /** Project root (default: directory of calling file) */
  root?: string;
  /** Layout component */
  layout?: React.FC<{ children: React.ReactNode; title?: string; user: any }>;
}

// ─── Session Store ────────────────────────────────────────────────────────────

interface SessionData { userId: number; email: string; username: string }
const sessions = new Map<string, { data: SessionData; expiresAt: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [id, s] of sessions) { if (now > s.expiresAt) sessions.delete(id); }
}, 60_000);

function makeSessionId(secret: string): string {
  const r = randomBytes(32).toString('hex');
  const sig = createHash('sha256').update(r + secret).digest('hex').slice(0, 16);
  return `${r}.${sig}`;
}

// ─── Server Component Helper ──────────────────────────────────────────────────

const registry = new Map<string, ServerComponentMeta>();

/**
 * Create a server component.
 *
 *   export default serverComponent(async (ctx) => {
 *     return <div>Hello {ctx.user?.username}</div>;
 *   });
 */
export function serverComponent(
  fn: ServerComponentFn,
  name?: string
): ServerComponentMeta {
  const meta: ServerComponentMeta = {
    __server: true,
    fn,
    name: name || fn.name || 'Page',
  };
  registry.set(meta.name, meta);
  return meta;
}

// ─── Route Helper ─────────────────────────────────────────────────────────────

type RouteHandler = (req: Request, res: Response) => Promise<void> | void;

interface RouteDefinition {
  method: 'get' | 'post' | 'put' | 'delete';
  path: string;
  handler: RouteHandler;
}

const routeRegistry: RouteDefinition[] = [];

/**
 * Define a route handler.
 *
 *   export default route('post', '/auth/login', async (req, res) => {
 *     // handle login
 *   });
 */
export function route(method: RouteDefinition['method'], path: string, handler: RouteHandler): RouteDefinition {
  const def = { method, path, handler };
  routeRegistry.push(def);
  return def;
}

// ─── Task Helper ──────────────────────────────────────────────────────────────

const taskRegistry = new Map<string, { handler: Function; options: any }>();

/**
 * Define a background task.
 *
 *   export default task('sendEmail', async (userId: number) => {
 *     // send email
 *   }, { queue: 'emails', retries: 3 });
 */
export function task<T extends (...args: any[]) => Promise<any>>(
  name: string,
  handler: T,
  options?: { queue?: string; retries?: number }
): { run: (...args: Parameters<T>) => Promise<any>; name: string } {
  taskRegistry.set(name, { handler, options });

  return {
    name,
    run: async (...args: Parameters<T>) => {
      // Execute directly (in production, this would enqueue)
      return handler(...args);
    },
  };
}

// ─── Auto-Discovery ──────────────────────────────────────────────────────────

async function discoverDir(dir: string): Promise<Record<string, any>> {
  const modules: Record<string, any> = {};
  try {
    const files = await readdir(dir);
    for (const file of files) {
      if (file.startsWith('_') || file === 'index.ts' || file === 'index.js') continue;
      if (!file.endsWith('.ts') && !file.endsWith('.tsx') && !file.endsWith('.js')) continue;

      const name = file.replace(/\.(ts|tsx|js)$/, '');
      try {
        const mod = await import(join(dir, file));
        modules[name] = mod;
      } catch (err) {
        console.error(`[Reacto] Failed to load ${dir}/${file}:`, (err as Error).message);
      }
    }
  } catch {
    // Directory doesn't exist, that's fine
  }
  return modules;
}

// ─── Create SSR App ──────────────────────────────────────────────────────────

export interface SSRAppResult {
  app: Express;
  server: Server;
  start: (port?: number) => Promise<void>;
}

/**
 * Create a batteries-included SSR app.
 *
 * Auto-discovers: models/, views/, routes/, tasks/
 *
 *   // server.ts — that's it
 *   import { createSSRApp } from '@reacto-org/ssr';
 *   createSSRApp();
 */
export async function createSSRApp(config: SSRConfig = {}): Promise<SSRAppResult> {
  const root = config.root || resolve('.');
  const secret = config.secret || randomBytes(32).toString('hex');

  // ─── Configure Core ──────────────────────────────────────────────

  autoConfigure();

  if (config.database) {
    configureDatabase({
      host: config.database.host || 'localhost',
      port: config.database.port || 5432,
      database: config.database.database || 'reacto',
      user: config.database.user || 'postgres',
      password: config.database.password || 'postgres',
    });
  }

  if (config.cache) {
    configureCache({ memory: config.cache });
  }

  // ─── Express Setup ───────────────────────────────────────────────

  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Session middleware
  const cookieName = 'reacto_session';
  const maxAge = config.maxAge ?? 7 * 24 * 60 * 60;

  app.use((req, _res, next) => {
    const sid = (req.cookies as any)?.[cookieName];
    if (sid) {
      const session = sessions.get(sid);
      if (session && Date.now() < session.expiresAt) {
        (req as any).session = session.data;
      }
    }

    (req as any).login = (user: SessionData) => {
      const id = makeSessionId(secret);
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
  const staticDirs = config.static || [join(root, 'public')];
  for (const dir of staticDirs) {
    app.use(express.static(dir));
  }

  // ─── Auto-Discover & Mount ───────────────────────────────────────

  // Models — import all from models/ to trigger registration
  const modelsDir = join(root, 'models');
  const models = await discoverDir(modelsDir);
  console.log(`[Reacto] Models: ${Object.keys(models).join(', ') || '(none)'}`);

  // Views — auto-mount server components
  const viewsDir = join(root, 'views');
  const views = await discoverDir(viewsDir);

  for (const [name, mod] of Object.entries(views)) {
    const component = mod.default || mod[name];
    if (component && '__server' in component) {
      const meta = component as ServerComponentMeta;
      const urlPath = meta.path || `/${name === 'HomePage' ? '' : name.toLowerCase().replace(/page$/i, '')}`;

      app.get(urlPath === '/' ? '/' : urlPath, async (req: Request, res: Response) => {
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

          const element = await meta.fn(ctx, { ...req.params, ...req.query });
          const bodyHtml = renderToString(element);
          const pageHtml = wrapLayout(bodyHtml, 'CineLog', ctx.user, config.layout);
          res.type('html').send(pageHtml);
        } catch (error) {
          console.error(`[Reacto] Error rendering ${name}:`, error);
          res.status(500).type('html').send(errorPage((error as Error).message));
        }
      });

      console.log(`[Reacto] View: ${name} → ${urlPath}`);
    }
  }

  // Routes — auto-mount handlers
  const routesDir = join(root, 'routes');
  const routes = await discoverDir(routesDir);

  for (const [name, mod] of Object.entries(routes)) {
    // Check for default export (single route) or named exports (multiple routes)
    const handlers = mod.default ? [mod.default] : Object.values(mod);

    for (const handler of handlers) {
      if (handler && typeof handler === 'object' && 'method' in handler && 'path' in handler) {
        const r = handler as RouteDefinition;
        app[r.method](r.path, r.handler);
        console.log(`[Reacto] Route: ${r.method.toUpperCase()} ${r.path}`);
      }
    }
  }

  // Tasks — register background tasks
  const tasksDir = join(root, 'tasks');
  const tasks = await discoverDir(tasksDir);
  console.log(`[Reacto] Tasks: ${Object.keys(tasks).join(', ') || '(none)'}`);

  // ─── Auth API (built-in) ─────────────────────────────────────────

  app.get('/api/auth/me', (req, res) => {
    const session = (req as any).session;
    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user: { id: session.userId, email: session.email, username: session.username } });
  });

  // ─── 404 ─────────────────────────────────────────────────────────

  app.use((_req, res) => {
    res.status(404).type('html').send(notFoundPage());
  });

  // ─── Server ──────────────────────────────────────────────────────

  const server = createServer(app);

  const start = async (port?: number) => {
    const p = port || config.port || 3000;
    return new Promise<void>((resolve) => {
      server.listen(p, () => {
        console.log(`\n[Reacto] 🚀 http://localhost:${p}\n`);
        resolve();
      });
    });
  };

  return { app, server, start };
}

// ─── HTML Helpers ─────────────────────────────────────────────────────────────

function wrapLayout(bodyHtml: string, title: string, user: any, layout?: React.FC<any>): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  ${bodyHtml}
  <script src="/client.js"></script>
</body>
</html>`;
}

function errorPage(message: string): string {
  return wrapLayout(
    `<div style="padding:40px;color:#e74c3c;font-family:monospace">
      <h1>500 — Server Error</h1>
      <pre>${esc(message)}</pre>
    </div>`,
    'Error',
    null
  );
}

function notFoundPage(): string {
  return wrapLayout(
    `<div style="padding:40px;text-align:center">
      <h1>404 — Not Found</h1>
      <p><a href="/" style="color:#6c5ce7">Go home</a></p>
    </div>`,
    'Not Found',
    null
  );
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Client Components (for hydration) ────────────────────────────────────────

export {
  WSProvider,
  useWS,
  ChatPanel,
  LiveFeed,
  RealTime,
  ConnectionStatus,
} from './client.js';
