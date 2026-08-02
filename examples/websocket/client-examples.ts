/**
 * Client-side WebSocket usage examples
 *
 * Copy these into your frontend code.
 */

// ─── 1. Vanilla JS — Connect and subscribe ────────────────────────────────────

function connectWebSocket(token) {
  const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);

  ws.onopen = () => {
    console.log('Connected!');
    // Subscribe to message channel
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'messages' }));
  };

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);

    switch (msg.type) {
      case 'created':
        console.log('New message:', msg.data);
        // Add to your UI state
        break;
      case 'updated':
        console.log('Message updated:', msg.data);
        // Update in your UI state
        break;
      case 'deleted':
        console.log('Message deleted:', msg.id);
        // Remove from your UI state
        break;
      case 'subscribed':
        console.log('Subscribed to:', msg.channel);
        break;
    }
  };

  ws.onclose = () => {
    console.log('Disconnected, reconnecting in 3s...');
    setTimeout(() => connectWebSocket(token), 3000);
  };

  return ws;
}

// ─── 2. React Hook ───────────────────────────────────────────────────────────

/*
import { useState, useEffect, useRef, useCallback } from 'react';

function useWebSocket(token, channels = []) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState(null);
  const wsRef = useRef(null);

  useEffect(() => {
    if (!token) return;

    const ws = new WebSocket(`ws://localhost:3000/ws?token=${token}`);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      channels.forEach(ch => {
        ws.send(JSON.stringify({ type: 'subscribe', channel: ch }));
      });
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      setLastMessage(msg);
    };

    ws.onclose = () => {
      setConnected(false);
      // Auto-reconnect
      setTimeout(() => {
        // Re-mount effect
      }, 3000);
    };

    return () => ws.close();
  }, [token]);

  const subscribe = useCallback((channel) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'subscribe', channel }));
    }
  }, []);

  const unsubscribe = useCallback((channel) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'unsubscribe', channel }));
    }
  }, []);

  return { connected, lastMessage, subscribe, unsubscribe };
}

// Usage in a component:
function ChatApp({ token }) {
  const { connected, lastMessage, subscribe } = useWebSocket(token, ['messages']);
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'created') {
      setMessages(prev => [...prev, lastMessage.data]);
    } else if (lastMessage.type === 'deleted') {
      setMessages(prev => prev.filter(m => m.id !== lastMessage.id));
    }
  }, [lastMessage]);

  return (
    <div>
      <p>Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}</p>
      {messages.map(m => <p key={m.id}>{m.body}</p>)}
    </div>
  );
}
*/

// ─── 3. Python client ────────────────────────────────────────────────────────

/*
import asyncio
import websockets
import json

async def listen(token):
    uri = f"ws://localhost:3000/ws?token={token}"
    async with websockets.connect(uri) as ws:
        await ws.send(json.dumps({"type": "subscribe", "channel": "messages"}))

        async for message in ws:
            data = json.loads(message)
            print(f"Event: {data['type']} - {data.get('data')}")

asyncio.run(listen("your-jwt-token"))
*/
