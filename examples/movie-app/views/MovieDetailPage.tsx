/**
 * Movie Detail Page — auto-mounted at /moviedetailpage?id=123
 */
import React from 'react';
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { Movie, Review } from '../models/index.js';

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

export default serverComponent(async (ctx) => {
  const movieId = parseInt(ctx.query.id as string);

  let movie: InstanceType<typeof Movie>;
  try {
    movie = await ModelManager.objects(Movie).get({ id: movieId });
  } catch {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2>Movie not found</h2>
        <a href="/" style={{ color: '#6c5ce7' }}>← Back</a>
      </div>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ movieId })
    .with('user')
    .orderBy('-createdAt')
    .all();

  const error = ctx.query.error;

  return (
    <div>
      <nav style={nav}>
        <h1 style={{ fontSize: 20, color: '#fff', margin: 0 }}>🎬 <span style={{ color: '#6c5ce7' }}>Cine</span>Log</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <a href="/" style={navBtn}>🎬 Movies</a>
          {ctx.user && <span style={{ color: '#fff', fontSize: 14 }}>👤 {ctx.user.username}</span>}
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <a href="/" style={{ color: '#6c5ce7', fontSize: 14 }}>← Back to Movies</a>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, marginTop: 16 }}>
          <div style={{ width: 200, height: 280, background: '#16213e', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>
            {GENRE_EMOJI[movie.genre || ''] || '🎬'}
          </div>

          <div>
            <h1 style={{ fontSize: 28, color: '#fff', margin: '0 0 8px' }}>{movie.title}</h1>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>{movie.director} · {movie.year} · {movie.genre}</div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>⭐ {movie.averageRating || '—'}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Rating</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>{movie.reviewCount}</div>
                <div style={{ fontSize: 12, color: '#888' }}>Reviews</div>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{movie.description}</p>

            {error && <div style={{ background: 'rgba(231,76,60,0.1)', border: '1px solid #e74c3c', color: '#e74c3c', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 16 }}>{decodeURIComponent(error)}</div>}

            {ctx.user ? (
              <form method="POST" action={`/api/reviews`} style={{ background: '#16213e', padding: 16, borderRadius: 8, marginBottom: 24 }}>
                <input type="hidden" name="movieId" value={movieId} />
                <h3 style={{ fontSize: 14, marginBottom: 12, color: '#fff' }}>✍️ Write a Review</h3>
                <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                  <select name="rating" required style={{ background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#e0e0e0', padding: '6px 10px', borderRadius: 6 }}>
                    <option value="">Rating...</option>
                    {[10,9,8,7,6,5,4,3,2,1].map(n => <option key={n} value={n}>{n} ⭐</option>)}
                  </select>
                  <input type="text" name="comment" placeholder="What did you think?" style={{ flex: 1, background: '#1a1a2e', border: '1px solid #2a2a4a', color: '#e0e0e0', padding: '8px 12px', borderRadius: 6, fontSize: 14 }} />
                  <button type="submit" style={{ background: '#6c5ce7', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 6, cursor: 'pointer' }}>Submit</button>
                </div>
              </form>
            ) : (
              <div style={{ background: '#16213e', padding: 16, borderRadius: 8, marginBottom: 24, textAlign: 'center' }}>
                <a href="/loginpage" style={{ color: '#6c5ce7' }}>Login</a> to write a review
              </div>
            )}

            <h3 style={{ fontSize: 16, marginBottom: 12, color: '#fff' }}>📝 Reviews</h3>
            {reviews.length > 0 ? reviews.map(r => (
              <div key={r.id} style={{ padding: '12px 0', borderBottom: '1px solid #2a2a4a' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{r.user?.username || 'Anonymous'}</span>
                  <span style={{ color: '#f1c40f', fontSize: 12 }}>{'⭐'.repeat(r.rating)}</span>
                </div>
                {r.comment && <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 4px' }}>{r.comment}</p>}
                <span style={{ fontSize: 12, color: '#888' }}>{new Date(r.watchedAt || r.createdAt).toLocaleDateString()}</span>
              </div>
            )) : <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>No reviews yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}, 'MovieDetailPage');

const nav: React.CSSProperties = { background: '#1a1a2e', borderBottom: '1px solid #2a2a4a', padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' };
const navBtn: React.CSSProperties = { background: 'none', border: '1px solid #2a2a4a', color: '#e0e0e0', padding: '8px 16px', borderRadius: 6, fontSize: 13, textDecoration: 'none' };
