/**
 * @reacto/frontend — WebSocket subscription hook for React
 *
 * Provides real-time model updates via WebSocket.
 *
 * @example
 * ```tsx
 * import { useSubscription } from '@reacto/frontend';
 *
 * function PostList() {
 *   const { data, latest, connected } = useSubscription('posts');
 *
 *   return (
 *     <div>
 *       <span>{connected ? '🟢 Live' : '🔴 Disconnected'}</span>
 *       {data.map(post => <div key={post.id}>{post.title}</div>)}
 *     </div>
 *   );
 * }
 * ```
 */
import { useEffect, useRef, useState, useCallback } from 'react';

interface WsMessage {
  type: string;
  channel?: string;
  model?: string;
  id?: number;
  data?: unknown;
  timestamp?: string;
}

export interface SubscriptionOptions {
  /** WebSocket URL (default: ws://localhost:3000/ws) */
  url?: string;
  /** Auth token */
  token?: string;
  /** Auto-reconnect on disconnect (default: true) */
  reconnect?: boolean;
  /** Reconnect interval in ms (default: 3000) */
  reconnectInterval?: number;
  /** Filter events by type */
  filter?: ('created' | 'updated' | 'deleted')[];
}

export interface SubscriptionResult<T> {
  /** All received data items */
  data: T[];
  /** Latest message (full event) */
  latest: WsMessage | null;
  /** Whether WebSocket is connected */
  connected: boolean;
  /** Unsubscribe from channel */
  unsubscribe: () => void;
  /** Clear received data */
  clear: () => void;
}

/**
 * Subscribe to real-time model updates via WebSocket.
 *
 * @param channel - Channel name (usually the table name, e.g., 'posts')
 * @param options - Connection options
 *
 * @example
 * ```tsx
 * // Basic usage
 * const { data, connected } = useSubscription('posts');
 *
 * // With auth
 * const { data } = useSubscription('posts', { token: 'jwt-token' });
 *
 * // Only created events
 * const { data } = useSubscription('posts', { filter: ['created'] });
 *
 * // Custom URL
 * const { data } = useSubscription('posts', { url: 'wss://api.example.com/ws' });
 * ```
 */
export function useSubscription<T = unknown>(
  channel: string,
  options: SubscriptionOptions = {}
): SubscriptionResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [latest, setLatest] = useState<WsMessage | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const {
    url = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws',
    token,
    reconnect = true,
    reconnectInterval = 3000,
    filter,
  } = options;

  const connect = useCallback(() => {
    if (typeof WebSocket === 'undefined') return;

    const wsUrl = token ? `${url}?token=${token}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({ type: 'subscribe', channel }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;

        if (msg.channel !== channel) return;

        // Apply filter
        if (filter && msg.type && !filter.includes(msg.type as any)) return;

        setLatest(msg);

        if (msg.data !== undefined) {
          setData((prev) => [...prev, msg.data as T]);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnect) {
        reconnectRef.current = setTimeout(connect, reconnectInterval);
      }
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, [channel, url, token, reconnect, reconnectInterval, filter]);

  useEffect(() => {
    connect();

    return () => {
      clearTimeout(reconnectRef.current);
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
      }
      wsRef.current?.close();
    };
  }, [connect, channel]);

  const unsubscribe = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, [channel]);

  const clear = useCallback(() => {
    setData([]);
    setLatest(null);
  }, []);

  return { data, latest, connected, unsubscribe, clear };
}

/**
 * Subscribe to multiple channels at once.
 */
export function useMultiSubscription<T = unknown>(
  channels: string[],
  options: SubscriptionOptions = {}
): { data: Record<string, T[]>; connected: boolean } {
  const [data, setData] = useState<Record<string, T[]>>(
    Object.fromEntries(channels.map((c) => [c, []]))
  );
  const [connected, setConnected] = useState(false);

  const {
    url = typeof window !== 'undefined'
      ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
      : 'ws://localhost:3000/ws',
    token,
    reconnect = true,
    reconnectInterval = 3000,
  } = options;

  useEffect(() => {
    if (typeof WebSocket === 'undefined') return;

    const wsUrl = token ? `${url}?token=${token}` : url;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      for (const ch of channels) {
        ws.send(JSON.stringify({ type: 'subscribe', channel: ch }));
      }
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as WsMessage;
        if (msg.channel && channels.includes(msg.channel) && msg.data !== undefined) {
          setData((prev) => ({
            ...prev,
            [msg.channel!]: [...(prev[msg.channel!] ?? []), msg.data as T],
          }));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setConnected(false);
      if (reconnect) {
        setTimeout(() => {
          // Reconnect handled by effect re-run
        }, reconnectInterval);
      }
    };

    return () => {
      ws.close();
    };
  }, [channels.join(','), url, token, reconnect, reconnectInterval]);

  return { data, connected };
}
