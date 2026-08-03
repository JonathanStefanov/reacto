import type { User, View } from '../App';

interface HeaderProps {
  user: User | null;
  view: View;
  onNavigate: (view: View) => void;
  onWatched: () => void;
  onLogout: () => void;
}

export function Header({ user, view, onNavigate, onWatched, onLogout }: HeaderProps) {
  return (
    <header className="header">
      <h1 className="logo">
        🎬 <span className="accent">Cine</span>Log
      </h1>
      {user && (
        <nav className="header-nav">
          <button
            className={`nav-btn ${view === 'movies' ? 'active' : ''}`}
            onClick={() => onNavigate('movies')}
          >
            🎬 Movies
          </button>
          <button
            className={`nav-btn ${view === 'watched' ? 'active' : ''}`}
            onClick={onWatched}
          >
            📋 My List
          </button>
          <div className="user-badge">
            <div className="avatar">{user.username[0].toUpperCase()}</div>
            <span>{user.username}</span>
          </div>
          <button className="nav-btn" onClick={onLogout}>
            Logout
          </button>
        </nav>
      )}
    </header>
  );
}
