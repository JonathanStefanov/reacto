/**
 * Client-side JavaScript — minimal interactivity.
 *
 * Handles: navigation (auth-aware), star rating hover, chat.
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
  const container = document.querySelector('.star-input');
  if (!container) return;

  const labels = container.querySelectorAll('label');

  labels.forEach(label => {
    const input = label.querySelector('input');
    const span = label.querySelector('span');
    if (!input || !span) return;

    label.addEventListener('mouseenter', () => {
      const value = parseInt(input.value);
      labels.forEach(l => {
        const inp = l.querySelector('input');
        const sp = l.querySelector('span');
        if (inp && sp) {
          sp.style.color = parseInt(inp.value) <= value ? '#f1c40f' : '#2a2a4a';
        }
      });
    });
  });

  container.addEventListener('mouseleave', () => {
    const checked = container.querySelector('input:checked');
    const val = checked ? parseInt(checked.value) : 0;
    labels.forEach(l => {
      const inp = l.querySelector('input');
      const sp = l.querySelector('span');
      if (inp && sp) {
        sp.style.color = parseInt(inp.value) <= val ? '#f1c40f' : '#2a2a4a';
      }
    });
  });
}

// ─── Chat Panel ──────────────────────────────────────────────────────────────

function initChat() {
  // Only init chat on pages with the chat container
  const chatContainer = document.getElementById('chat-panel');
  if (!chatContainer) return;

  // Chat is initialized via the API version only
  // SSR version uses page navigation, not a chat panel
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── Init ────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initStarRating();
  initChat();
});
