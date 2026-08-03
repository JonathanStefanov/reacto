/**
 * Home Page — Movie list with search, filter, pagination
 *
 * Server component. Uses ModelManager directly. No API calls.
 */
import React from 'react';
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import { Movie } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

const GENRES = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'];
const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

export const HomePage = serverComponent(async (ctx) => {
  const search = (ctx.query.search as string) || '';
  const genre = (ctx.query.genre as string) || '';
  const page = parseInt((ctx.query.page as string) || '1');
  const pageSize = 12;

  let qs = ModelManager.objects(Movie);
  if (search) qs = qs.search(['title', 'director', 'description'], search);
  if (genre) qs = qs.filter({ genre });

  const total = await qs.count();
  const movies = await qs.orderBy('-averageRating').paginate(page, pageSize).cache(60).all();
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Layout title="🎬 CineLog" user={ctx.user}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
        {/* Search */}
        <form method="GET" style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <input
            type="text"
            name="search"
            placeholder="🔍 Search movies..."
            defaultValue={search}
            style={inputStyle}
          />
          <select name="genre" defaultValue={genre} style={inputStyle}>
            <option value="">All Genres</option>
            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="submit" style={btnPrimary}>Search</button>
        </form>

        {/* Movie Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}>
          {movies.map(movie => (
            <a key={movie.id} href={`/movies/${movie.id}`} style={cardStyle}>
              <div style={{
                height: 120,
                background: '#16213e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
              }}>
                {GENRE_EMOJI[movie.genre || ''] || '🎬'}
              </div>
              <div style={{ padding: 12 }}>
                <h3 style={{ fontSize: 14, color: '#fff', margin: '0 0 4px' }}>{movie.title}</h3>
                <div style={{ fontSize: 12, color: '#888' }}>{movie.director} · {movie.year}</div>
                <div style={{ fontSize: 13, marginTop: 6 }}>
                  ⭐ {movie.averageRating || '—'} ({movie.reviewCount})
                </div>
              </div>
            </a>
          ))}
          {movies.length === 0 && (
            <p style={{ gridColumn: '1/-1', textAlign: 'center', color: '#888', padding: 40 }}>
              No movies found. Try a different search!
            </p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 16, marginTop: 24 }}>
            {page > 1 && (
              <a href={`/?page=${page - 1}&search=${search}&genre=${genre}`} style={btnOutline}>← Prev</a>
            )}
            <span style={{ color: '#888', fontSize: 14 }}>Page {page} of {totalPages}</span>
            {page < totalPages && (
              <a href={`/?page=${page + 1}&search=${search}&genre=${genre}`} style={btnOutline}>Next →</a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}, 'HomePage');

// ─── Styles ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  background: '#16213e',
  border: '1px solid #2a2a4a',
  color: '#e0e0e0',
  padding: '10px 14px',
  borderRadius: 8,
  fontSize: 14,
  flex: 1,
};

const btnPrimary: React.CSSProperties = {
  background: '#6c5ce7',
  color: '#fff',
  border: 'none',
  padding: '10px 20px',
  borderRadius: 8,
  fontSize: 14,
  cursor: 'pointer',
  fontWeight: 500,
};

const btnOutline: React.CSSProperties = {
  background: 'none',
  border: '1px solid #2a2a4a',
  color: '#e0e0e0',
  padding: '8px 16px',
  borderRadius: 6,
  fontSize: 14,
  textDecoration: 'none',
};

const cardStyle: React.CSSProperties = {
  background: '#1a1a2e',
  border: '1px solid #2a2a4a',
  borderRadius: 10,
  overflow: 'hidden',
  textDecoration: 'none',
  color: 'inherit',
  transition: 'all 0.2s',
};
