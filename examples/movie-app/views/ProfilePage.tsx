import React from 'react';
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Review } from '../models/index.js';

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

export default serverComponent(async (ctx) => {
  if (!ctx.user) {
    return <div style={{ padding: 40, textAlign: 'center' }}><p><a href="/loginpage" style={{ color: '#6c5ce7' }}>Login</a> to view your profile.</p></div>;
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .orderBy('-watchedAt')
    .all();

  return (
    <div>
      <nav style={nav}>
        <h1 style={{ fontSize: 20, color: '#fff', margin: 0 }}>🎬 <span style={{ color: '#6c5ce7' }}>Cine</span>Log</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={navBtn}>🎬 Movies</a>
          <span style={{ color: '#fff', fontSize: 14 }}>👤 {ctx.user.username}</span>
          <a href="/auth/logout" style={navBtn}>Logout</a>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <div style={{ background: '#1a1a2e', borderRadius: 12, border: '1px solid #2a2a4a' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #2a2a4a' }}>
            <h2 style={{ fontSize: 16, color: '#fff', margin: 0 }}>📋 {ctx.user.username}'s Watched Movies</h2>
          </div>
          <div style={{ padding: 20 }}>
            {reviews.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
                No movies yet. <a href="/" style={{ color: '#6c5ce7' }}>Browse movies</a>
              </p>
            ) : reviews.map(r => (
              <div key={r.id} style={{ display: 'flex', gap: 12, padding: '12px 0', borderBottom: '1px solid #2a2a4a', alignItems: 'center' }}>
                <div style={{ width: 50, height: 70, background: '#16213e', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {GENRE_EMOJI[r.movie?.genre || ''] || '🎬'}
                </div>
                <div style={{ flex: 1 }}>
                  <h3 style={{ fontSize: 14, color: '#fff', margin: 0 }}>
                    <a href={`/moviedetailpage?id=${r.movieId}`} style={{ color: '#fff', textDecoration: 'none' }}>{r.movie?.title || 'Unknown'}</a>
                  </h3>
                  <div style={{ fontSize: 12, color: '#888' }}>Watched {new Date(r.watchedAt).toLocaleDateString()}</div>
                  {r.comment && <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{r.comment}</div>}
                </div>
                <div style={{ color: '#f1c40f', fontSize: 16 }}>{'⭐'.repeat(r.rating)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}, 'ProfilePage');

const nav: React.CSSProperties = { background: '#1a1a2e', borderBottom: '1px solid #2a2a4a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const navBtn: React.CSSProperties = { background: 'none', border: '1px solid #2a2a4a', color: '#e0e0e0', padding: '8px 16px', borderRadius: 6, fontSize: 13, textDecoration: 'none' };
