/**
 * Client-side JavaScript — minimal, only for interactivity.
 *
 * Most of the app is server-rendered. This handles:
 * - Navigation bar (auth-aware)
 * - Chat panel (WebSocket)
 * - Star rating hover effects
 */

// ─── Navigation ──────────────────────────────────────────────────────────────

async function initNav() {
  const nav = document.getElementById('nav');
  if (!nav) return;

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const { user } = await res.json();
      nav.innerHTML = `
        <a href="/" class="nav-btn">🎬 Movies</a>
        <a href="/profile" class="nav-btn">📋 My List</a>
        <span class="user-badge">
          <span class="avatar">${user.username[0].toUpperCase()}</span>
          ${user.username}
        </span>
        <a href="/auth/logout" class="nav-btn">Logout</a>
      `;
    } else {
      nav.innerHTML = `
        <a href="/" class="nav-btn">🎬 Movies</a>
        <a href="/login" class="nav-btn">🔑 Login</a>
        <a href="/register" class="nav-btn">🚀 Register</a>
      `;
    }
  } catch {
    nav.innerHTML = `<a href="/" class="nav-btn">🎬 Movies</a>`;
  }
}

// ─── Star Rating Hover ───────────────────────────────────────────────────────

function initStarRating() {
  const starInputs = document.querySelectorAll('.star-input label');

  starInputs.forEach(label => {
    const input = label.querySelector('input');
    const span = label.querySelector('span');
    if (!input || !span) return;

    label.addEventListener('mouseenter', () => {
      // Highlight this star and all after it
      const value = parseInt(input.value);
      starInputs.forEach(l => {
        const inp = l.querySelector('input');
        const sp = l.querySelector('span');
        if (inp && sp) {
          sp.style.color = parseInt(inp.value) <= value ? '#f1c40f' : '#2a2a4a';
        }
      });
    });

    label.addEventListener('mouseleave', () => {
      // Reset to selected value
      const checked = document.querySelector('.star-input input:checked');
      const checkedVal = checked ? parseInt(checked.value) : 0;
      starInputs.forEach(l => {
        const inp = l.querySelector('input');
        const sp = l.querySelector('span');
        if (inp && sp) {
          sp.style.color = parseInt(inp.value) <= checkedVal ? '#f1c40f' : '#2a2a4a';
        }
      });
    });

    input.addEventListener('change', () => {
      const value = parseInt(input.value);
      starInputs.forEach(l => {
        const inp = l.querySelector('input');
        const sp = l.querySelector('span');
        if (inp && sp) {
          sp.style.color = parseInt(inp.value) <= value ? '#f1c40f' : '#2a2a4a';
        }
      });
    });
  });
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function initChat() {
  const chatContainer = document.getElementById('chat-panel');
  if (!chatContainer) return;

  // Create chat UI
  chatContainer.innerHTML = `
    <div class="card chat-panel">
      <div class="card-header"><h2>💬 Chat</h2></div>
      <div class="chat-messages" id="chat-messages"></div>
      <div class="chat-input-area">
        <input type="text" id="chat-input" placeholder="Type a message..." />
        <button class="btn btn-primary" id="chat-send">Send</button>
      </div>
    </div>
  `;

  const messagesEl = document.getElementById('chat-messages');
  const inputEl = document.getElementById('chat-input') as HTMLInputElement;
  const sendBtn = document.getElementById('chat-send');

  let currentUserId: number | null = null;

  // Get current user
  fetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .then(data => { currentUserId = data?.user?.id || null; })
    .catch(() => {});

  // Connect WebSocket
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${location.host}/ws`);

  ws.onopen = () => {
    console.log('🔌 Chat connected');
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'chat' }));
  };

  ws.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data);

      if (msg.type === 'chat-history') {
        const messages = msg.data?.messages || [];
        messages.forEach((m: any) => appendMessage(m));
      } else if (msg.type === 'chat-message') {
        appendMessage(msg.data);
      }
    } catch (err) {
      console.error('WS parse error:', err);
    }
  };

  ws.onclose = () => {
    console.log('🔌 Chat disconnected, reconnecting...');
    setTimeout(initChat, 3000);
  };

  function appendMessage(msg: any) {
    if (!messagesEl) return;
    const isSelf = msg.userId === currentUserId;
    const div = document.createElement('div');
    div.className = `chat-msg ${isSelf ? 'self' : ''}`;
    div.innerHTML = `
      <div class="msg-header">${escapeHtml(msg.user?.username || 'Anonymous')}</div>
      <div class="msg-body">${escapeHtml(msg.content)}</div>
      <div class="msg-time">${new Date(msg.createdAt).toLocaleTimeString()}</div>
    `;
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function sendMessage() {
    if (!inputEl || !inputEl.value.trim()) return;
    ws.send(JSON.stringify({
      type: 'chat-message',
      data: { content: inputEl.value.trim(), channel: 'general' },
    }));
    inputEl.value = '';
  }

  sendBtn?.addEventListener('click', sendMessage);
  inputEl?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initStarRating();
  initChat();
});
