/**
 * Client-side JavaScript — minimal interactivity.
 *
 * SSR handles the HTML. This handles:
 * - Chat panel (WebSocket)
 * - Star rating hover effects
 */

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function initChat() {
  const container = document.getElementById('chat-panel');
  if (!container) return;

  container.innerHTML = `
    <div style="display:flex;flex-direction:column;height:500px;background:#1a1a2e;border-radius:12px;border:1px solid #2a2a4a;overflow:hidden">
      <div style="padding:12px 16px;border-bottom:1px solid #2a2a4a">
        <h3 style="margin:0;font-size:14px;color:#fff">💬 Chat</h3>
      </div>
      <div id="chat-messages" style="flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px"></div>
      <div style="padding:12px;border-top:1px solid #2a2a4a;display:flex;gap:8px">
        <input id="chat-input" type="text" placeholder="Type a message..." style="flex:1;background:#16213e;border:1px solid #2a2a4a;color:#e0e0e0;padding:8px 12px;border-radius:6px;font-size:13px">
        <button id="chat-send" style="background:#6c5ce7;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px">Send</button>
      </div>
    </div>
  `;

  const messages = document.getElementById('chat-messages');
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send');

  let currentUserId = null;

  fetch('/api/auth/me')
    .then(r => r.ok ? r.json() : null)
    .then(d => { currentUserId = d?.user?.id || null; })
    .catch(() => {});

  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${proto}//${location.host}/ws`);

  ws.onopen = () => {
    console.log('🔌 Chat connected');
    ws.send(JSON.stringify({ type: 'subscribe', channel: 'chat' }));
  };

  ws.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      if (msg.type === 'chat-history') {
        (msg.data?.messages || []).forEach(addMsg);
      } else if (msg.type === 'chat-message') {
        addMsg(msg.data);
      }
    } catch {}
  };

  ws.onclose = () => {
    console.log('🔌 Chat disconnected');
    setTimeout(initChat, 3000);
  };

  function addMsg(m) {
    if (!messages) return;
    const self = m.userId === currentUserId;
    const div = document.createElement('div');
    div.style.cssText = `max-width:85%;${self ? 'align-self:flex-end' : ''}`;
    div.innerHTML = `
      <div style="font-size:11px;color:${self ? '#00b894' : '#6c5ce7'};margin-bottom:2px;${self ? 'text-align:right' : ''}">${esc(m.user?.username || 'Anonymous')}</div>
      <div style="background:${self ? 'rgba(108,92,231,0.2)' : '#16213e'};padding:8px 12px;border-radius:8px;font-size:13px;line-height:1.4">${esc(m.content)}</div>
      <div style="font-size:10px;color:#888;margin-top:2px">${new Date(m.createdAt).toLocaleTimeString()}</div>
    `;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  function send() {
    if (!input || !input.value.trim()) return;
    ws.send(JSON.stringify({ type: 'chat-message', data: { content: input.value.trim(), channel: 'general' } }));
    input.value = '';
  }

  sendBtn?.addEventListener('click', send);
  input?.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });
}

function esc(s) {
  if (!s) return '';
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', initChat);
