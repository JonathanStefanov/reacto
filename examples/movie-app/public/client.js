/**
 * Client-side JavaScript — enhances server-rendered HTML with interactivity.
 *
 * The server renders the HTML. This script adds:
 * - Chat (WebSocket)
 * - Connection status
 */

// ─── WebSocket Manager ───────────────────────────────────────────────────────

const ws = {
  socket: null,
  connected: false,
  handlers: new Map(),
  reconnectTimer: null,

  connect() {
    if (this.socket?.readyState === WebSocket.OPEN) return;

    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.socket = new WebSocket(`${proto}//${location.host}/ws`);

    this.socket.onopen = () => {
      this.connected = true;
      this.updateStatus();
      console.log('🔌 Connected');
    };

    this.socket.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        const handlers = this.handlers.get(msg.type);
        if (handlers) handlers.forEach(fn => fn(msg.data || msg));
      } catch {}
    };

    this.socket.onclose = () => {
      this.connected = false;
      this.updateStatus();
      this.reconnectTimer = setTimeout(() => this.connect(), 3000);
    };
  },

  subscribe(channel) {
    this.socket?.send(JSON.stringify({ type: 'subscribe', channel }));
  },

  send(type, data) {
    this.socket?.send(JSON.stringify({ type, data }));
  },

  on(type, fn) {
    if (!this.handlers.has(type)) this.handlers.set(type, new Set());
    this.handlers.get(type).add(fn);
    return () => this.handlers.get(type)?.delete(fn);
  },

  updateStatus() {
    const el = document.getElementById('chat-status');
    if (el) {
      el.textContent = this.connected ? '● Live' : '○ Disconnected';
      el.style.color = this.connected ? '#00b894' : '#e74c3c';
    }
  },
};

// ─── Chat Component ──────────────────────────────────────────────────────────

const chat = {
  userId: null,

  init() {
    const container = document.getElementById('chat-island');
    if (!container) return;

    // Get current user
    fetch('/api/auth/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => { this.userId = d?.user?.id || null; })
      .catch(() => {});

    // Connect WebSocket
    ws.connect();

    // Subscribe to chat channel
    ws.on('connected', () => {
      ws.subscribe('chat');
    });

    // Load chat history
    ws.on('chat-history', (data) => {
      const messages = data?.messages || [];
      messages.forEach(m => this.addMessage(m));
    });

    // New messages
    ws.on('chat-message', (data) => {
      this.addMessage(data);
    });

    // Send button
    const sendBtn = document.getElementById('chat-send');
    const input = document.getElementById('chat-input');

    sendBtn?.addEventListener('click', () => this.sendMessage());
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.sendMessage();
    });
  },

  sendMessage() {
    const input = document.getElementById('chat-input');
    if (!input || !input.value.trim()) return;

    ws.send('chat-message', {
      content: input.value.trim(),
      channel: 'general',
    });

    input.value = '';
  },

  addMessage(msg) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const self = msg.userId === this.userId;
    const div = document.createElement('div');
    div.style.cssText = `max-width:85%;${self ? 'align-self:flex-end' : ''}`;

    div.innerHTML = `
      <div style="font-size:11px;color:${self ? '#00b894' : '#6c5ce7'};margin-bottom:2px;${self ? 'text-align:right' : ''}">${esc(msg.user?.username || 'Anonymous')}</div>
      <div style="background:${self ? 'rgba(108,92,231,0.2)' : '#16213e'};padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.4">${esc(msg.content)}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">${new Date(msg.createdAt).toLocaleTimeString()}</div>
    `;

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function esc(str) {
  if (!str) return '';
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  chat.init();
});
