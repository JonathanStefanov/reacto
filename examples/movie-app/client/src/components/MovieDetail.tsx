import { useState } from 'react';
import type { Movie, Review } from '../App';

interface MovieDetailProps {
  movie: Movie & { reviews?: Review[] };
  onBack: () => void;
  onAddReview: (movieId: number, rating: number, comment: string) => Promise<void>;
}

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

function getGenreEmoji(genre?: string) {
  return genre ? GENRE_EMOJI[genre] || '🎬' : '🎬';
}

export function MovieDetail({ movie, onBack, onAddReview }: MovieDetailProps) {
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitReview = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    await onAddReview(movie.id, rating, comment);
    setRating(0);
    setComment('');
    setSubmitting(false);
  };

  return (
    <div className="movie-detail-page">
      <button className="btn btn-outline" onClick={onBack}>← Back to Movies</button>

      <div className="card movie-detail-card">
        <div className="card-body">
          <div className="movie-detail">
            <div className="movie-detail-poster">
              {getGenreEmoji(movie.genre)}
            </div>
            <div className="movie-detail-info">
              <h1>{movie.title}</h1>
              <div className="movie-detail-meta">
                {movie.director} · {movie.year}
                {movie.genre && <> · {movie.genre}</>}
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

              {/* ─── Review Form ───────────────────────────────── */}
              <div className="review-form">
                <h3>✍️ Write a Review</h3>
                <div className="star-input">
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <span
                      key={n}
                      className={n <= (hoveredRating || rating) ? 'active' : ''}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHoveredRating(n)}
                      onMouseLeave={() => setHoveredRating(0)}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  placeholder="What did you think?"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                />
                <button
                  className="btn btn-primary"
                  disabled={rating === 0 || submitting}
                  onClick={handleSubmitReview}
                >
                  {submitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>

              {/* ─── Reviews ──────────────────────────────────── */}
              <h3 className="reviews-title">📝 Reviews</h3>
              {movie.reviews && movie.reviews.length > 0 ? (
                <div className="reviews-list">
                  {movie.reviews.map(review => (
                    <div key={review.id} className="review-item">
                      <div className="review-header">
                        <span className="review-user">
                          {review.user?.username || 'Anonymous'}
                        </span>
                        <span className="review-stars">
                          {'⭐'.repeat(review.rating)}
                        </span>
                      </div>
                      {review.comment && (
                        <p className="review-comment">{review.comment}</p>
                      )}
                      <span className="review-date">
                        {new Date(review.watchedAt || review.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="empty-state">No reviews yet. Be the first!</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
