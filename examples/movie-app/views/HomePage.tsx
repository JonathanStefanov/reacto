/**
 * Home Page — auto-mounted at /
 *
 * Server component with client-side chat island.
 */
import React from 'react';
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'];

export default serverComponent(async (ctx) => {
  const search = (ctx.query.search as string) || '';
  const genre = (ctx.query.genre as string) || '';
  const page = parseInt((ctx.query.page as string) || '1');

  let qs = ModelManager.objects(Movie);
  if (search) qs = qs.search(['title', 'director', 'description'], search);
  if (genre) qs = qs.filter({ genre });

  const total = await qs.count();
  const movies = await qs.orderBy('-averageRating').paginate(page, 12).cache(60).all();
  const totalPages = Math.ceil(total / 12);

  return (
    <div>
      {/* Navigation */}
      <nav style={nav}>
        <h1 style={{ fontSize: 20, color: '#fff', margin: 0 }}>🎬 <span style={{ color: '#6c5ce7' }}>Cine</span>Log</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={navBtn}>🎬 Movies</a>
          {ctx.user ? (
            <>
              <a href="/profilepage" style={navBtn}>📋 My List</a>
              <span style={{ color: '#fff', fontSize: 14 }}>👤 {ctx.user.username}</span>
              <a href="/auth/logout" style={navBtn}>Logout</a>
            </>
          ) : (
            <>
              <a href="/loginpage" style={navBtn}>🔑 Login</a>
              <a href="/registerpage" style={navBtn}>🚀 Register</a>
            </>
          )}
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ display: 'flex', maxWidth: 1400, margin: '0 auto', padding: 24, gap: 24 }}>
        {/* Movie Grid */}
        <div style={{ flex: 1 }}>
          <form method="GET" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <input type="text" name="search" placeholder="🔍 Search movies..." defaultValue={search} style={input} />
            <select name="genre" defaultValue={genre} style={input}>
              <option value="">All Genres</option>
              {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button type="submit" style={btn}>Search</button>
          </form>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {movies.map(m => (
              <a key={m.id} href={`/moviedetailpage?id=${m.id}`} style={card}>
                <div style={{ height: 120, background: '#16213e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
                  {GENRE_EMOJI[m.genre || ''] || '🎬'}
                </div>
                <div style={{ padding: 12 }}>
                  <h3 style={{ fontSize: 14, color: '#fff', margin: '0 0 4px' }}>{m.title}</h3>
                  <div style={{ fontSize: 12, color: '#888' }}>{m.director} · {m.year}</div>
                  <div style={{ fontSize: 13, marginTop: 6 }}>⭐ {m.averageRating || '—'} ({m.reviewCount})</div>
                </div>
              </a>
            ))}
            {movies.length === 0 && <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: 40 }}>No movies found.</p>}
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
              {page > 1 && <a href={`/?page=${page - 1}&search=${search}&genre=${genre}`} style={navBtn}>← Prev</a>}
              <span style={{ color: '#888', fontSize: 14, lineHeight: '36px' }}>Page {page} of {totalPages}</span>
              {page < totalPages && <a href={`/?page=${page + 1}&search=${search}&genre=${genre}`} style={navBtn}>Next →</a>}
            </div>
          )}
        </div>

        {/* Chat Island — hydrated by client-side React */}
        <div id="chat-island" style={{ width: 380, flexShrink: 0 }}>
          <div style={chatContainer}>
            <div style={chatHeader}>
              <h3 style={{ margin: 0, fontSize: 14, color: '#fff' }}>💬 Chat</h3>
              <span id="chat-status" style={{ fontSize: 11, color: '#888' }}>○ Connecting...</span>
            </div>
            <div id="chat-messages" style={chatMessages}></div>
            <div style={chatInputArea}>
              <input id="chat-input" type="text" placeholder="Type a message..." style={chatInput} />
              <button id="chat-send" style={chatSendBtn}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, 'HomePage');

// ─── Styles ───────────────────────────────────────────────────────────────────

const nav: React.CSSProperties = {
  background: '#1a1a2e', borderBottom: '1px solid #2a2a4a', padding: '16px 24px',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  position: 'sticky', top: 0, zIndex: 100,
};
const navBtn: React.CSSProperties = {
  background: 'none', border: '1px solid #2a2a4a', color: '#e0e0e0',
  padding: '8px 16px', borderRadius: 6, fontSize: 13, textDecoration: 'none',
};
const input: React.CSSProperties = {
  background: '#16213e', border: '1px solid #2a2a4a', color: '#e0e0e0',
  padding: '10px 14px', borderRadius: 8, fontSize: 14, flex: 1,
};
const btn: React.CSSProperties = {
  background: '#6c5ce7', color: '#fff', border: 'none',
  padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
};
const card: React.CSSProperties = {
  background: '#1a1a2e', border: '1px solid #2a2a4a', borderRadius: 10,
  overflow: 'hidden', textDecoration: 'none', color: 'inherit',
};
const chatContainer: React.CSSProperties = {
  display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)',
  background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4a', overflow: 'hidden',
};
const chatHeader: React.CSSProperties = {
  padding: '12px 16px', borderBottom: '1px solid #2a2a4a',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
};
const chatMessages: React.CSSProperties = {
  flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8,
};
const chatInputArea: React.CSSProperties = {
  padding: 12, borderTop: '1px solid #2a2a4a', display: 'flex', gap: 8,
};
const chatInput: React.CSSProperties = {
  flex: 1, background: '#16213e', border: '1px solid #2a2a4a', color: '#e0e0e0',
  padding: '8px 12px', borderRadius: 6, fontSize: 13,
};
const chatSendBtn: React.CSSProperties = {
  background: '#6c5ce7', color: '#fff', border: 'none',
  padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13,
};
