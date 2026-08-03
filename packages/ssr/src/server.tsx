/**
 * Server Component — runs on the server, can use models/auth directly.
 *
 *   export const MovieList = serverComponent(async ({ req, user }) => {
 *     const movies = await ModelManager.objects(Movie).all();
 *     return <div>{movies.map(m => <MovieCard key={m.id} movie={m} />)}</div>;
 *   });
 */
import React from 'react';
import type { ServerContext } from './context.js';

export type ServerComponentFn<P = Record<string, unknown>> = (
  ctx: ServerContext & { params?: Record<string, string> },
  props: P
) => Promise<React.ReactElement> | React.ReactElement;

interface ServerComponentMeta {
  __serverComponent: true;
  fn: ServerComponentFn;
  displayName: string;
}

/**
 * Create a server component.
 *
 * Server components:
 * - Run ONLY on the server
 * - Can import and use @reacto-org/core directly (ModelManager, etc.)
 * - Can access req.user, req.session, etc.
 * - Render to HTML on the server
 * - Ship ZERO JavaScript to the client
 *
 * @example
 *   export const UserProfile = serverComponent(async ({ user }) => {
 *     if (!user) return <Redirect to="/login" />;
 *
 *     const reviews = await ModelManager.objects(Review)
 *       .filter({ userId: user.id })
 *       .with('movie')
 *       .all();
 *
 *     return (
 *       <div>
 *         <h1>{user.username}'s Profile</h1>
 *         {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
 *       </div>
 *     );
 *   });
 */
export function serverComponent<P = Record<string, unknown>>(
  fn: ServerComponentFn<P>,
  displayName?: string
): React.FC<P> & ServerComponentMeta {
  const component = ((props: P) => {
    // When rendered on the server, this will be called
    // The actual rendering happens in the SSR engine
    return null as unknown as React.ReactElement;
  }) as React.FC<P> & ServerComponentMeta;

  component.__serverComponent = true;
  component.fn = fn;
  component.displayName = displayName || fn.name || 'ServerComponent';

  return component;
}

/**
 * Check if a component is a server component.
 */
export function isServerComponent(
  component: unknown
): component is React.FC & ServerComponentMeta {
  return (
    typeof component === 'function' &&
    '__serverComponent' in component &&
    (component as ServerComponentMeta).__serverComponent === true
  );
}
