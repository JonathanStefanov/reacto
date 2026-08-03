/**
 * Movie Detail Page — movie info + reviews + review form
 */
import React from 'react';
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import { Movie, Review } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

export const MovieDetailPage = serverComponent(async (ctx) => {
  const movieId = parseInt(ctx.params.id);

  let movie: InstanceType<typeof Movie>;
  try {
    movie = await ModelManager.objects(Movie).get({ id: movieId });
  } catch {
    return (
      <Layout title="Not Found" user={ctx.user}>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h2>Movie not found</h2>
          <a href="/" style={{ color: '#6c5ce7' }}>← Back to movies</a>
        </div>
      </Layout>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ movieId })
    .with('user')
    .orderBy('-createdAt')
    .all();

  const error = ctx.query.error;

  return (
    <Layout title={`${movie.title} — CineLog`} user={ctx.user}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: 24 }}>
        <a href="/" style={{ color: '#6c5ce7', fontSize: 14 }}>← Back to Movies</a>

        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr', gap: 24, marginTop: 16 }}>
          {/* Poster */}
          <div style={{
            width: 200,
            height: 280,
            background: '#16213e',
            borderRadius: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 64,
          }}>
            {getGenreEmoji(movie.genre)}
          </div>

          {/* Info */}
          <div>
            <h1 style={{ fontSize: 28, color: '#fff', margin: '0 0 8px' }}>{movie.title}</h1>
            <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>
              {movie.director} · {movie.year} · {movie.genre || 'Uncategorized'}
            </div>

            <div style={{ display: 'flex', gap: 24, marginBottom: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
                  ⭐ {movie.averageRating || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Rating</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#fff' }}>
                  {movie.reviewCount}
                </div>
                <div style={{ fontSize: 12, color: '#888' }}>Reviews</div>
              </div>
            </div>

            <p style={{ fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>{movie.description}</p>

            {error && (
              <div style={{
                background: 'rgba(231,76,60,0.1)',
                border: '1px solid #e74c3c',
                color: '#e74c3c',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
              }}>
                {decodeURIComponent(error)}
              </div>
            )}

            {/* Review Form */}
            {ctx.user ? (
              <form method="POST" action={`/movies/${movieId}/reviews`} style={{
                background: '#16213e',
                padding: 16,
                borderRadius: 8,
                marginBottom: 24,
              }}>
                <h3 style={{ fontSize: 14, marginBottom: 12, color: '#fff' }}>✍️ Write a Review</h3>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  <label style={{ fontSize: 13, color: '#888' }}>Rating:</label>
                  <select name="rating" required style={{
                    background: '#1a1a2e',
                    border: '1px solid #2a2a4a',
                    color: '#e0e0e0',
                    padding: '6px 10px',
                    borderRadius: 6,
                  }}>
                    <option value="">Select...</option>
                    {[10,9,8,7,6,5,4,3,2,1].map(n => (
                      <option key={n} value={n}>{n} ⭐</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <input
                    type="text"
                    name="comment"
                    placeholder="What did you think?"
                    style={{
                      flex: 1,
                      background: '#1a1a2e',
                      border: '1px solid #2a2a4a',
                      color: '#e0e0e0',
                      padding: '10px 14px',
                      borderRadius: 8,
                      fontSize: 14,
                    }}
                  />
                  <button type="submit" style={{
                    background: '#6c5ce7',
                    color: '#fff',
                    border: 'none',
                    padding: '10px 20px',
                    borderRadius: 8,
                    fontSize: 14,
                    cursor: 'pointer',
                  }}>
                    Submit
                  </button>
                </div>
              </form>
            ) : (
              <div style={{
                background: '#16213e',
                padding: 16,
                borderRadius: 8,
                marginBottom: 24,
                textAlign: 'center',
              }}>
                <a href="/login" style={{ color: '#6c5ce7' }}>Login</a> to write a review
              </div>
            )}

            {/* Reviews */}
            <h3 style={{ fontSize: 16, marginBottom: 12, color: '#fff' }}>📝 Reviews</h3>
            {reviews.length > 0 ? reviews.map(review => (
              <div key={review.id} style={{
                padding: '12px 0',
                borderBottom: '1px solid #2a2a4a',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>
                    {review.user?.username || 'Anonymous'}
                  </span>
                  <span style={{ color: '#f1c40f', fontSize: 12 }}>
                    {'⭐'.repeat(review.rating)}
                  </span>
                </div>
                {review.comment && (
                  <p style={{ fontSize: 13, lineHeight: 1.5, margin: '0 0 4px' }}>{review.comment}</p>
                )}
                <span style={{ fontSize: 12, color: '#888' }}>
                  {new Date(review.watchedAt || review.createdAt).toLocaleDateString()}
                </span>
              </div>
            )) : (
              <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>
                No reviews yet. Be the first!
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'MovieDetailPage');

function getGenreEmoji(genre?: string) {
  const map: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
  };
  return genre ? map[genre] || '🎬' : '🎬';
}
