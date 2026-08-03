import { useState, useCallback, useRef, useEffect } from 'react';
import type { ChatMessage } from '../App';

export function useChat(token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${location.host}/ws`);
    wsRef.current = ws;

    ws.onopen = () => console.log('🔌 Connected to chat');

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'chat-history') {
          setMessages(msg.data.messages || []);
        } else if (msg.type === 'chat-message') {
          setMessages(prev => [...prev, msg.data]);
        }
      } catch (err) {
        console.error('Failed to parse WS message:', err);
      }
    };

    ws.onclose = () => {
      console.log('🔌 Disconnected from chat');
      // Reconnect after 3s
      if (token) {
        reconnectTimer.current = setTimeout(() => connect(), 3000);
      }
    };

    ws.onerror = (err) => console.error('WS error:', err);
  }, [token]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setMessages([]);
  }, []);

  const sendMessage = useCallback((content: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({
      type: 'chat-message',
      data: { content, channel: 'general' },
    }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { messages, sendMessage, connect, disconnect };
}
