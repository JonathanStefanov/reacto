/**
 * Server Context — provides req, user, and models to server components.
 */
import { createContext, useContext } from 'react';
import type { Request } from 'express';

export interface ServerContext {
  /** Express request object */
  req: Request;
  /** Authenticated user (from session) */
  user: {
    id: number;
    email: string;
    username: string;
    [key: string]: unknown;
  } | null;
  /** Flash messages */
  flash: (type: string, message: string) => void;
  /** URL path */
  path: string;
  /** Query parameters */
  query: Record<string, string>;
}

const ServerContextInstance = createContext<ServerContext | null>(null);

/**
 * Provider for server context — used internally by the SSR engine.
 */
export const ServerContextProvider = ServerContextInstance.Provider;

/**
 * Hook to access server context in server components.
 *
 *   const { user, req, query } = useServerContext();
 *
 *   if (!user) {
 *     return <Redirect to="/login" />;
 *   }
 */
export function useServerContext(): ServerContext {
  const ctx = useContext(ServerContextInstance);
  if (!ctx) {
    throw new Error('useServerContext() can only be used inside a server component');
  }
  return ctx;
}
