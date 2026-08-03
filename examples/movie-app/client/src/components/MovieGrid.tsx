import type { Movie } from '../App';

interface MovieGridProps {
  movies: Movie[];
  loading: boolean;
  page: number;
  totalPages: number;
  search: string;
  genre: string;
  onSearch: (term: string) => void;
  onGenreFilter: (genre: string) => void;
  onPageChange: (page: number) => void;
  onSelectMovie: (id: number) => void;
}

const GENRES = ['', 'Action', 'Comedy', 'Drama', 'Horror', 'Sci-Fi', 'Romance', 'Thriller', 'Documentary'];

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

function getGenreEmoji(genre?: string) {
  return genre ? GENRE_EMOJI[genre] || '🎬' : '🎬';
}

export function MovieGrid({
  movies, loading, page, totalPages,
  search, genre, onSearch, onGenreFilter, onPageChange, onSelectMovie,
}: MovieGridProps) {
  return (
    <div className="movie-grid-container">
      <div className="search-bar">
        <input
          type="text"
          placeholder="🔍 Search movies..."
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
        <select value={genre} onChange={(e) => onGenreFilter(e.target.value)}>
          {GENRES.map(g => (
            <option key={g} value={g}>{g || 'All Genres'}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : (
        <div className="movie-grid">
          {movies.map(movie => (
            <div key={movie.id} className="movie-card" onClick={() => onSelectMovie(movie.id)}>
              <div className="movie-poster">{getGenreEmoji(movie.genre)}</div>
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <div className="movie-meta">{movie.director} · {movie.year}</div>
                <div className="movie-rating">
                  <span className="star">⭐</span>
                  <span className="score">{movie.averageRating || '—'}</span>
                  <span className="review-count">({movie.reviewCount})</span>
                </div>
              </div>
            </div>
          ))}
          {movies.length === 0 && (
            <p className="empty-state">No movies found. Try a different search!</p>
          )}
        </div>
      )}

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => onPageChange(page - 1)}>← Prev</button>
        <span>Page {page} of {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>Next →</button>
      </div>
    </div>
  );
}
