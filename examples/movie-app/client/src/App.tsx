import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './hooks/useAuth';
import { useChat } from './hooks/useChat';
import { Header } from './components/Header';
import { AuthForm } from './components/AuthForm';
import { MovieGrid } from './components/MovieGrid';
import { MovieDetail } from './components/MovieDetail';
import { WatchedList } from './components/WatchedList';
import { ChatPanel } from './components/ChatPanel';
import { Notification } from './components/Notification';

export type View = 'movies' | 'detail' | 'watched' | 'auth';

export interface Movie {
  id: number;
  title: string;
  description: string;
  director: string;
  year: number;
  genre?: string;
  posterUrl?: string;
  averageRating: number;
  reviewCount: number;
}

export interface Review {
  id: number;
  movieId: number;
  userId: number;
  rating: number;
  comment?: string;
  watchedAt: string;
  createdAt: string;
  user?: User;
  movie?: Movie;
}

export interface User {
  id: number;
  username: string;
  email: string;
  bio?: string;
  avatarUrl?: string;
}

export interface ChatMessage {
  id: number;
  userId: number;
  content: string;
  channel: string;
  createdAt: string;
  user?: User;
}

export function App() {
  const { user, token, login, register, logout, checkAuth } = useAuth();
  const { messages: chatMessages, sendMessage, connect: connectChat, disconnect: disconnectChat } = useChat(token);
  const [view, setView] = useState<View>('auth');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [currentMovie, setCurrentMovie] = useState<(Movie & { reviews?: Review[] }) | null>(null);
  const [watched, setWatched] = useState<(Review & { movie?: Movie })[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [genre, setGenre] = useState('');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState('');

  // ─── Auth ──────────────────────────────────────────────────────────

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user && token) {
      setView('movies');
      connectChat();
      loadMovies();
    } else {
      setView('auth');
      disconnectChat();
    }
  }, [user, token]);

  // ─── API Helper ────────────────────────────────────────────────────

  const api = useCallback(async (path: string, options?: RequestInit) => {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(path, { ...options, headers });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }, [token]);

  // ─── Movies ────────────────────────────────────────────────────────

  const loadMovies = useCallback(async (p = page, s = search, g = genre) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: String(p), pageSize: '12' });
      if (s) params.set('search', s);
      if (g) params.set('genre', g);

      const data = await api(`/api/movies?${params}`);
      setMovies(data.data);
      setTotalPages(data.pagination.totalPages);
      setPage(p);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api, page, search, genre]);

  const loadMovieDetail = async (id: number) => {
    try {
      setLoading(true);
      setView('detail');
      const data = await api(`/api/movies/${id}`);
      setCurrentMovie(data.movie);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const addReview = async (movieId: number, rating: number, comment: string) => {
    try {
      await api(`/api/movies/${movieId}/reviews`, {
        method: 'POST',
        body: JSON.stringify({ rating, comment }),
      });
      notify('⭐ Review added!');
      loadMovieDetail(movieId);
    } catch (err) {
      notify('❌ ' + (err as Error).message);
    }
  };

  const loadWatched = async () => {
    try {
      setLoading(true);
      setView('watched');
      const data = await api('/api/users/me/watched');
      setWatched(data.watched);
    } catch (err) {
      notify((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // ─── Notifications ─────────────────────────────────────────────────

  const notify = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(''), 3000);
  };

  // ─── Handlers ──────────────────────────────────────────────────────

  const handleSearch = (term: string) => {
    setSearch(term);
    loadMovies(1, term, genre);
  };

  const handleGenreFilter = (g: string) => {
    setGenre(g);
    loadMovies(1, search, g);
  };

  const handlePageChange = (p: number) => {
    loadMovies(p);
  };

  const handleLogin = async (email: string, password: string) => {
    const success = await login(email, password);
    if (!success) notify('❌ Invalid credentials');
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    const success = await register(username, email, password);
    if (success) notify('🎉 Welcome! Check your email for a surprise.');
  };

  const handleLogout = () => {
    logout();
    disconnectChat();
    setView('auth');
  };

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="app">
      <Header
        user={user}
        view={view}
        onNavigate={(v) => {
          setView(v);
          if (v === 'movies') loadMovies();
        }}
        onWatched={loadWatched}
        onLogout={handleLogout}
      />

      <main className="container">
        {view === 'auth' && (
          <AuthForm
            onLogin={handleLogin}
            onRegister={handleRegister}
            loading={loading}
          />
        )}

        {view === 'movies' && (
          <div className="grid">
            <MovieGrid
              movies={movies}
              loading={loading}
              page={page}
              totalPages={totalPages}
              search={search}
              genre={genre}
              onSearch={handleSearch}
              onGenreFilter={handleGenreFilter}
              onPageChange={handlePageChange}
              onSelectMovie={loadMovieDetail}
            />
            <ChatPanel
              messages={chatMessages}
              currentUser={user}
              onSend={sendMessage}
            />
          </div>
        )}

        {view === 'detail' && currentMovie && (
          <MovieDetail
            movie={currentMovie}
            onBack={() => { setView('movies'); loadMovies(); }}
            onAddReview={addReview}
          />
        )}

        {view === 'watched' && (
          <WatchedList watched={watched} />
        )}
      </main>

      {notification && <Notification message={notification} />}
    </div>
  );
}
