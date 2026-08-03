/**
 * SSR Renderer — renders React components to HTML on the server.
 *
 * Handles:
 * - Server components (rendered to HTML, no client JS)
 * - Client components (rendered to HTML + hydrated on client)
 * - Server context injection (req, user, etc.)
 */
import React from 'react';
import { renderToString } from 'react-dom/server';
import { ServerContextProvider, type ServerContext } from './context.js';
import { isServerComponent } from './server.js';
import { isClientComponent } from './client.js';

export interface RenderOptions {
  /** Server context (req, user, etc.) */
  context: ServerContext;
  /** Additional props to pass to the root component */
  props?: Record<string, unknown>;
  /** Client component chunks to preload */
  clientChunks?: string[];
  /** Title for the HTML page */
  title?: string;
  /** Additional head content */
  head?: string;
  /** Additional body classes */
  bodyClass?: string;
}

/**
 * Render a React component tree to HTML.
 *
 * Server components are rendered inline (no client JS).
 * Client components are rendered with hydration markers.
 */
export async function renderToHTML(
  element: React.ReactElement,
  options: RenderOptions
): Promise<string> {
  const { context, title = 'Reacto App', head = '', bodyClass = '' } = options;

  // Wrap with server context provider
  const wrapped = React.createElement(
    ServerContextProvider,
    { value: context },
    element
  );

  // Render to string
  const html = renderToString(wrapped);

  // Collect client component chunks for preloading
  const clientChunks = collectClientChunks(element);

  // Build the full HTML page
  return buildPageHTML({
    title,
    bodyClass,
    head,
    html,
    clientChunks,
    context,
  });
}

/**
 * Render a server component function directly.
 *
 *   const html = await renderServerComponent(MovieList, { req, user });
 */
export async function renderServerComponent<P = Record<string, unknown>>(
  component: React.FC<P> & { fn?: Function },
  context: ServerContext,
  props: P = {} as P
): Promise<string> {
  if (isServerComponent(component) && component.fn) {
    // Execute the server component function
    const element = await component.fn(context, props);
    return renderToString(
      React.createElement(ServerContextProvider, { value: context }, element)
    );
  }

  // Regular React component — render normally
  return renderToString(
    React.createElement(
      ServerContextProvider,
      { value: context },
      React.createElement(component, props)
    )
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function collectClientChunks(element: React.ReactElement): string[] {
  const chunks: string[] = [];

  function walk(el: React.ReactNode): void {
    if (!React.isValidElement(el)) return;

    const type = el.type;
    if (typeof type === 'function' && isClientComponent(type)) {
      chunks.push(type.chunkName);
    }

    // Walk children
    const children = el.props.children;
    if (children) {
      if (Array.isArray(children)) {
        children.forEach(walk);
      } else {
        walk(children);
      }
    }
  }

  walk(element);
  return [...new Set(chunks)];
}

interface PageHTMLParams {
  title: string;
  bodyClass: string;
  head: string;
  html: string;
  clientChunks: string[];
  context: ServerContext;
}

function buildPageHTML(params: PageHTMLParams): string {
  const { title, bodyClass, head, html, clientChunks, context } = params;

  // Client chunks as preload links
  const preloadLinks = clientChunks
    .map((chunk) => `<link rel="modulepreload" href="/assets/${chunk}.js">`)
    .join('\n    ');

  // Serialize context for client hydration
  const clientContext = JSON.stringify({
    user: context.user,
    path: context.path,
    query: context.query,
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  ${preloadLinks}
  ${head}
</head>
<body class="${bodyClass}">
  <div id="reacto-root">${html}</div>
  <script type="module">
    // Hydrate client components
    import { hydrateRoot } from 'react-dom/client';

    // Server context passed to client
    window.__REACTO_CONTEXT__ = ${clientContext};

    // Load and hydrate client components
    ${clientChunks.map((chunk) => `
    import('/assets/${chunk}.js').then(mod => {
      const el = document.querySelector('[data-chunk="${chunk}"]');
      if (el) {
        hydrateRoot(el, mod.default());
      }
    }).catch(console.error);`).join('')}
  </script>
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
