/**
 * Movie Detail Page — shows movie info, reviews, review form
 */
import { ModelManager } from '@reacto-org/core';
import { serverComponent } from '@reacto-org/ssr';
import React from 'react';
import { Movie, Review } from '../models/index.js';
import { Layout } from '../templates/Layout.js';

export const MovieDetailPage = serverComponent(async (ctx, props) => {
  const movieId = parseInt((props as { id: string }).id);

  let movie: InstanceType<typeof Movie>;
  try {
    movie = await ModelManager.objects(Movie).get({ id: movieId });
  } catch {
    return (
      <Layout title="Not Found">
        <div className="container">
          <p className="empty-state">Movie not found. <a href="/">Go back</a></p>
        </div>
      </Layout>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ movieId })
    .with('user')
    .orderBy('-createdAt')
    .all();

  const user = ctx.user;
  const error = ctx.query.error;

  return (
    <Layout title={`${movie.title} — CineLog`}>
      <div className="container">
        <a href="/" className="btn btn-outline" style={{ marginBottom: '16px' }}>← Back to Movies</a>

        <div className="movie-detail">
          <div className="movie-detail-poster">{getGenreEmoji(movie.genre)}</div>
          <div>
            <h1>{movie.title}</h1>
            <div className="movie-detail-meta">
              {movie.director} · {movie.year} · {movie.genre || 'Uncategorized'}
            </div>

            <div className="stats-row">
              <div className="stat">
                <div className="stat-num">⭐ {movie.averageRating || '—'}</div>
                <div className="stat-label">Rating</div>
              </div>
              <div className="stat">
                <div className="stat-num">{movie.reviewCount}</div>
                <div className="stat-label">Reviews</div>
              </div>
            </div>

            <p className="movie-detail-desc">{movie.description}</p>

            {error && <div className="error-msg">{decodeURIComponent(error)}</div>}

            {user ? (
              <form method="POST" action={`/movies/${movieId}/reviews`} className="review-form">
                <h3>✍️ Write a Review</h3>
                <div className="star-input">
                  {[10,9,8,7,6,5,4,3,2,1].map(n => (
                    <label key={n} style={{ cursor: 'pointer', fontSize: '20px' }}>
                      <input type="radio" name="rating" value={n} required style={{ display: 'none' }} />
                      <span className="star-hover">★</span>
                    </label>
                  ))}
                </div>
                <input type="text" name="comment" placeholder="What did you think?" className="review-input" />
                <button type="submit" className="btn btn-primary">Submit Review</button>
              </form>
            ) : (
              <p className="login-prompt"><a href="/login">Login</a> to write a review</p>
            )}

            <h3 className="reviews-title">📝 Reviews</h3>
            {reviews.length > 0 ? reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-user">{review.user?.username || 'Anonymous'}</span>
                  <span style={{ color: '#f1c40f' }}>{'⭐'.repeat(review.rating)}</span>
                </div>
                {review.comment && <p className="review-comment">{review.comment}</p>}
                <span className="review-date">
                  {new Date(review.watchedAt || review.createdAt).toLocaleDateString()}
                </span>
              </div>
            )) : <p className="empty-state">No reviews yet. Be the first!</p>}
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
