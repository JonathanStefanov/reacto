/**
 * @reacto-org/ssr — Server-Side Rendering with Partial Hydration
 *
 * Hybrid architecture: server-rendered pages with client-side interactivity.
 */

// ─── Core ────────────────────────────────────────────────────────────────────

export { createSSRApp, type SSRAppOptions, type SSRAppResult } from './app.js';

// ─── Components ──────────────────────────────────────────────────────────────

export { serverComponent, isServerComponent, type ServerComponentFn } from './server.js';
export { clientComponent, isClientComponent, type ClientComponentFn } from './client.js';

// ─── Context ─────────────────────────────────────────────────────────────────

export { useServerContext, ServerContextProvider, type ServerContext } from './context.js';

// ─── Rendering ───────────────────────────────────────────────────────────────

export { renderToHTML, renderServerComponent, type RenderOptions } from './render.js';

// ─── Session ─────────────────────────────────────────────────────────────────

export { createSessionMiddleware, type SessionOptions, type RequestWithSession } from './session.js';

// ─── Utilities ───────────────────────────────────────────────────────────────

export { html } from './html.js';
