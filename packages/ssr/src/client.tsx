/**
 * @reacto-org/client — Client-side React components for SSR apps
 *
 * Provides hydrated components for interactivity:
 *   <ChatPanel /> — Real-time chat
 *   <LiveFeed /> — Live notifications
 *   <RealTime> — Subscribe to real-time updates
 */
import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

// ─── WebSocket Context ───────────────────────────────────────────────────────

interface WSContextType {
  ws: WebSocket | null;
  connected: boolean;
  subscribe: (channel: string) => void;
  send: (type: string, data: unknown) => void;
  on: (type: string, handler: (data: unknown) => void) => () => void;
}

const WSContext = createContext<WSContextType>({
  ws: null,
  connected: false,
  subscribe: () => {},
  send: () => {},
  on: () => () => {},
});

/**
 * Provider that manages WebSocket connection.
 * Wrap your app with this to enable real-time features.
 */
export function WSProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Set<(data: unknown) => void>>>(new Map());
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${proto}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.log('🔌 WebSocket connected');
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const handlers = handlersRef.current.get(msg.type);
        if (handlers) {
          handlers.forEach(fn => fn(msg.data || msg));
        }
      } catch {}
    };

    ws.onclose = () => {
      setConnected(false);
      reconnectTimer.current = setTimeout(connect, 3000);
    };
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  const subscribe = useCallback((channel: string) => {
    wsRef.current?.send(JSON.stringify({ type: 'subscribe', channel }));
  }, []);

  const send = useCallback((type: string, data: unknown) => {
    wsRef.current?.send(JSON.stringify({ type, data }));
  }, []);

  const on = useCallback((type: string, handler: (data: unknown) => void) => {
    if (!handlersRef.current.has(type)) {
      handlersRef.current.set(type, new Set());
    }
    handlersRef.current.get(type)!.add(handler);

    return () => {
      handlersRef.current.get(type)?.delete(handler);
    };
  }, []);

  return (
    <WSContext.Provider value={{ ws: wsRef.current, connected, subscribe, send, on }}>
      {children}
    </WSContext.Provider>
  );
}

/**
 * Hook to access WebSocket context.
 */
export function useWS() {
  return useContext(WSContext);
}

// ─── Chat Panel Component ────────────────────────────────────────────────────

interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  channel: string;
  createdAt: string;
  user?: { id: number; username: string };
}

interface ChatPanelProps {
  channel?: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Real-time chat panel. Hydrates on client for interactivity.
 *
 *   <ChatPanel channel="general" />
 */
export function ChatPanel({ channel = 'general', className, style }: ChatPanelProps) {
  const { connected, subscribe, send, on } = useWS();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [userId, setUserId] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get current user
  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => setUserId(d?.user?.id || null))
      .catch(() => {});
  }, []);

  // Subscribe to channel
  useEffect(() => {
    if (connected) {
      subscribe(channel);
    }
  }, [connected, channel, subscribe]);

  // Listen for messages
  useEffect(() => {
    const unsubHistory = on('chat-history', (data: any) => {
      setMessages(data?.messages || []);
    });

    const unsubMessage = on('chat-message', (data: any) => {
      setMessages(prev => [...prev, data]);
    });

    return () => {
      unsubHistory();
      unsubMessage();
    };
  }, [on]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    send('chat-message', { content: trimmed, channel });
    setInput('');
  };

  return (
    <div className={className} style={{ ...containerStyle, ...style }}>
      <div style={headerStyle}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#fff' }}>💬 Chat</h3>
        <span style={{ fontSize: 11, color: connected ? '#00b894' : '#e74c3c' }}>
          {connected ? '● Connected' : '○ Disconnected'}
        </span>
      </div>

      <div style={messagesStyle}>
        {messages.map((msg, i) => (
          <div key={msg.id || i} style={{
            maxWidth: '85%',
            ...(msg.userId === userId ? { alignSelf: 'flex-end' } : {}),
          }}>
            <div style={{
              fontSize: 11,
              color: msg.userId === userId ? '#00b894' : '#6c5ce7',
              marginBottom: 2,
              textAlign: msg.userId === userId ? 'right' : 'left',
            }}>
              {msg.user?.username || 'Anonymous'}
            </div>
            <div style={{
              background: msg.userId === userId ? 'rgba(108,92,231,0.2)' : '#16213e',
              padding: '8px 12px',
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.4,
            }}>
              {msg.content}
            </div>
            <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div style={inputAreaStyle}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type a message..."
          style={chatInputStyle}
        />
        <button onClick={handleSend} style={sendBtnStyle}>Send</button>
      </div>
    </div>
  );
}

// ─── Live Feed Component ─────────────────────────────────────────────────────

interface LiveFeedProps {
  types?: string[];
  maxItems?: number;
  renderItem?: (item: { type: string; data: unknown; time: Date }) => React.ReactNode;
}

/**
 * Shows live events from WebSocket.
 *
 *   <LiveFeed types={['new-review', 'new-user']} />
 */
export function LiveFeed({ types = [], maxItems = 20, renderItem }: LiveFeedProps) {
  const { on } = useWS();
  const [items, setItems] = useState<Array<{ type: string; data: unknown; time: Date }>>([]);

  useEffect(() => {
    const unsubs = types.map(type =>
      on(type, (data) => {
        setItems(prev => [{ type, data, time: new Date() }, ...prev].slice(0, maxItems));
      })
    );

    return () => unsubs.forEach(fn => fn());
  }, [on, types, maxItems]);

  if (items.length === 0) return null;

  return (
    <div style={feedContainerStyle}>
      {items.map((item, i) => (
        renderItem ? renderItem(item) : (
          <div key={i} style={feedItemStyle}>
            <span style={{ color: '#6c5ce7', fontSize: 12 }}>{item.type}</span>
            <span style={{ color: '#888', fontSize: 11, marginLeft: 8 }}>
              {item.time.toLocaleTimeString()}
            </span>
          </div>
        )
      ))}
    </div>
  );
}

// ─── Real-Time Wrapper ───────────────────────────────────────────────────────

interface RealTimeProps {
  type: string;
  children: (data: unknown) => React.ReactNode;
}

/**
 * Subscribe to a WebSocket event and render children with the data.
 *
 *   <RealTime type="new-review">
 *     {(data) => <ReviewNotification data={data} />}
 *   </RealTime>
 */
export function RealTime({ type, children }: RealTimeProps) {
  const { on } = useWS();
  const [data, setData] = useState<unknown>(null);

  useEffect(() => {
    return on(type, setData);
  }, [on, type]);

  return <>{data ? children(data) : null}</>;
}

// ─── Connection Status ───────────────────────────────────────────────────────

/**
 * Shows WebSocket connection status.
 *
 *   <ConnectionStatus />
 */
export function ConnectionStatus() {
  const { connected } = useWS();

  return (
    <span style={{
      fontSize: 11,
      color: connected ? '#00b894' : '#e74c3c',
    }}>
      {connected ? '🟢 Live' : '🔴 Offline'}
    </span>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: 500,
  background: '#1a1a2e',
  borderRadius: 12,
  border: '1px solid #2a2a4a',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid #2a2a4a',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
};

const messagesStyle: React.CSSProperties = {
  flex: 1,
  overflowY: 'auto',
  padding: 12,
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const inputAreaStyle: React.CSSProperties = {
  padding: 12,
  borderTop: '1px solid #2a2a4a',
  display: 'flex',
  gap: 8,
};

const chatInputStyle: React.CSSProperties = {
  flex: 1,
  background: '#16213e',
  border: '1px solid #2a2a4a',
  color: '#e0e0e0',
  padding: '8px 12px',
  borderRadius: 6,
  fontSize: 13,
};

const sendBtnStyle: React.CSSProperties = {
  background: '#6c5ce7',
  color: '#fff',
  border: 'none',
  padding: '8px 14px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 13,
};

const feedContainerStyle: React.CSSProperties = {
  background: '#1a1a2e',
  borderRadius: 8,
  border: '1px solid #2a2a4a',
  padding: 12,
  maxHeight: 300,
  overflowY: 'auto',
};

const feedItemStyle: React.CSSProperties = {
  padding: '6px 0',
  borderBottom: '1px solid #2a2a4a',
  fontSize: 13,
};
