import type { Review, Movie } from '../App';

interface WatchedListProps {
  watched: (Review & { movie?: Movie })[];
}

const GENRE_EMOJI: Record<string, string> = {
  Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
  'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
};

export function WatchedList({ watched }: WatchedListProps) {
  return (
    <div className="card">
      <div className="card-header">
        <h2>📋 My Watched Movies</h2>
      </div>
      <div className="card-body">
        {watched.length === 0 ? (
          <p className="empty-state">
            You haven't watched any movies yet. Go browse and add some!
          </p>
        ) : (
          <div className="watched-list">
            {watched.map(item => (
              <div key={item.id} className="watched-item">
                <div className="watched-poster">
                  {item.movie?.genre ? GENRE_EMOJI[item.movie.genre] || '🎬' : '🎬'}
                </div>
                <div className="watched-info">
                  <h3>{item.movie?.title || 'Unknown'}</h3>
                  <div className="watched-meta">
                    Watched {new Date(item.watchedAt).toLocaleDateString()}
                  </div>
                  {item.comment && (
                    <div className="watched-comment">{item.comment}</div>
                  )}
                </div>
                <div className="watched-rating">
                  {'⭐'.repeat(item.rating)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
