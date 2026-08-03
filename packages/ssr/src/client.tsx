/**
 * Client Component — hydrated on the client, for interactivity.
 *
 *   'use client';
 *   export function ChatPanel() {
 *     const [messages, setMessages] = useState([]);
 *     // WebSocket, event handlers, etc.
 *   }
 */
import React from 'react';

interface ClientComponentMeta {
  __clientComponent: true;
  chunkName: string;
}

/**
 * Mark a component as a client component.
 *
 * Client components:
 * - Render on the server (initial HTML)
 * - Hydrate on the client (become interactive)
 * - Can use hooks (useState, useEffect, etc.)
 * - Ship JavaScript to the client
 *
 * @example
 *   export const StarRating = clientComponent(function StarRating({ rating }) {
 *     const [hovered, setHovered] = useState(0);
 *
 *     return (
 *       <div>
 *         {[1,2,3,4,5].map(n => (
 *           <span
 *             key={n}
 *             className={n <= (hovered || rating) ? 'active' : ''}
 *             onMouseEnter={() => setHovered(n)}
 *             onMouseLeave={() => setHovered(0)}
 *           >
 *             ★
 *           </span>
 *         ))}
 *       </div>
 *     );
 *   }, 'StarRating');
 */
export function clientComponent<P = Record<string, unknown>>(
  component: React.FC<P>,
  chunkName?: string
): React.FC<P> & ClientComponentMeta {
  const wrapped = component as React.FC<P> & ClientComponentMeta;
  wrapped.__clientComponent = true;
  wrapped.chunkName = chunkName || component.displayName || component.name || 'ClientComponent';
  return wrapped;
}

/**
 * Check if a component is a client component.
 */
export function isClientComponent(
  component: unknown
): component is React.FC & ClientComponentMeta {
  return (
    typeof component === 'function' &&
    '__clientComponent' in component &&
    (component as ClientComponentMeta).__clientComponent === true
  );
}
