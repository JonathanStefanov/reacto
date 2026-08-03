import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import type { ChatMessage, User } from '../App';

interface ChatPanelProps {
  messages: ChatMessage[];
  currentUser: User | null;
  onSend: (content: string) => void;
}

export function ChatPanel({ messages, currentUser, onSend }: ChatPanelProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setInput('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSend();
  };

  return (
    <div className="card chat-panel">
      <div className="card-header">
        <h2>💬 Chat</h2>
      </div>
      <div className="chat-messages">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`chat-msg ${msg.userId === currentUser?.id ? 'self' : ''}`}
          >
            <div className="msg-header">
              {msg.user?.username || 'Anonymous'}
            </div>
            <div className="msg-body">{msg.content}</div>
            <div className="msg-time">
              {new Date(msg.createdAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input-area">
        <input
          type="text"
          placeholder="Type a message..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="btn btn-primary" onClick={handleSend}>
          Send
        </button>
      </div>
    </div>
  );
}
