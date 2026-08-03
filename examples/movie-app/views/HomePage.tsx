/**
 * Home Page — Movie list with search, filter, pagination
 */
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import React from 'react';
import { Movie } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

export const HomePage = serverComponent(async (ctx) => {
  const search = (ctx.query.search as string) || '';
  const genre = (ctx.query.genre as string) || '';
  const page = parseInt((ctx.query.page as string) || '1');
  const pageSize = 12;

  let qs = ModelManager.objects(Movie);

  if (search) {
    qs = qs.search(['title', 'director', 'description'], search);
  }
  if (genre) {
    qs = qs.filter({ genre });
  }

  const total = await qs.count();
  const movies = await qs.orderBy('-averageRating').paginate(page, pageSize).cache(60).all();
  const totalPages = Math.ceil(total / pageSize);

  const genres = ['Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'];

  return (
    <Layout title="🎬 CineLog — Movie Tracker">
      <div className="container">
        <form method="GET" className="search-bar">
          <input type="text" name="search" placeholder="🔍 Search movies..." defaultValue={search} />
          <select name="genre" defaultValue={genre}>
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        <div className="movie-grid">
          {movies.map(movie => (
            <a key={movie.id} href={`/movies/${movie.id}`} className="movie-card">
              <div className="movie-poster">{getGenreEmoji(movie.genre)}</div>
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <div className="movie-meta">{movie.director} · {movie.year}</div>
                <div className="movie-rating">
                  ⭐ {movie.averageRating || '—'} ({movie.reviewCount})
                </div>
              </div>
            </a>
          ))}
          {movies.length === 0 && <p className="empty-state">No movies found.</p>}
        </div>

        {totalPages > 1 && (
          <div className="pagination">
            {page > 1 && (
              <a href={`/?page=${page - 1}&search=${search}&genre=${genre}`} className="btn btn-outline">← Prev</a>
            )}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && (
              <a href={`/?page=${page + 1}&search=${search}&genre=${genre}`} className="btn btn-outline">Next →</a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}, 'HomePage');

function getGenreEmoji(genre?: string) {
  const map: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
  };
  return genre ? map[genre] || '🎬' : '🎬';
}
