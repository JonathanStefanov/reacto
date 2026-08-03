/**
 * Movie App — Full-featured Reacto example with SSR
 *
 * Uses server components for pages (models/auth used directly)
 * and client components for interactivity (chat, forms).
 */
import {
  configureDatabase,
  configureCache,
  configureTaskQueue,
  ModelManager,
  createTask,
  autoConfigure,
} from '@reacto-org/core';
import {
  createSSRApp,
  serverComponent,
  useServerContext,
  html,
} from '@reacto-org/ssr';
import { hashPassword } from '@reacto-org/server';
import React from 'react';
import { User, Movie, Review, ChatMessage } from './models.js';

// ─── Database Configuration ──────────────────────────────────────────────────

configureDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movieapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// ─── Cache Configuration ─────────────────────────────────────────────────────

configureCache({
  memory: { maxSize: 500, defaultTtl: 300 },
});

// ─── Background Tasks ────────────────────────────────────────────────────────

const sendWelcomeEmail = createTask(
  'sendWelcomeEmail',
  async (userId: number) => {
    const user = await ModelManager.objects(User).get({ id: userId });
    console.log(`📧 Sending welcome email to ${user.email}...`);
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`✅ Welcome email sent to ${user.email}`);
    return { sent: true, email: user.email };
  },
  { queue: 'emails', retries: 3 }
);

// ─── Create SSR App ──────────────────────────────────────────────────────────

const app = createSSRApp({
  session: {
    secret: process.env.SESSION_SECRET || 'reacto-movie-app-secret-change-me',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  static: ['./client/dist', './uploads'],
  port: parseInt(process.env.PORT || '3000'),
});

// ─── Server Components (rendered on server, zero client JS) ──────────────────

/**
 * Movie List Page — server component
 * Uses ModelManager directly, no API calls needed
 */
const MovieListPage = serverComponent(async (ctx) => {
  const { query } = ctx;
  const search = (query.search as string) || '';
  const genre = (query.genre as string) || '';
  const page = parseInt((query.page as string) || '1');
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

  return (
    <div className="container">
      <div className="search-bar">
        <form method="GET" action="/">
          <input type="text" name="search" placeholder="🔍 Search movies..." defaultValue={search} />
          <select name="genre" defaultValue={genre}>
            <option value="">All Genres</option>
            <option value="Action">Action</option>
            <option value="Comedy">Comedy</option>
            <option value="Drama">Drama</option>
            <option value="Horror">Horror</option>
            <option value="Sci-Fi">Sci-Fi</option>
            <option value="Romance">Romance</option>
            <option value="Thriller">Thriller</option>
            <option value="Documentary">Documentary</option>
          </select>
          <button type="submit">Search</button>
        </form>
      </div>

      <div className="movie-grid">
        {movies.map((movie) => (
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
          {page > 1 && <a href={`/?page=${page - 1}&search=${search}&genre=${genre}`}>← Prev</a>}
          <span>Page {page} of {totalPages}</span>
          {page < totalPages && <a href={`/?page=${page + 1}&search=${search}&genre=${genre}`}>Next →</a>}
        </div>
      )}
    </div>
  );
}, 'MovieListPage');

/**
 * Movie Detail Page — server component
 */
const MovieDetailPage = serverComponent(async (ctx, props) => {
  const movieId = parseInt((props as any).id);

  const movie = await ModelManager.objects(Movie)
    .with('reviews')
    .get({ id: movieId });

  const reviews = await ModelManager.objects(Review)
    .filter({ movieId })
    .with('user')
    .orderBy('-createdAt')
    .all();

  const { user } = ctx;

  return (
    <div className="container">
      <a href="/" className="btn btn-outline">← Back to Movies</a>

      <div className="movie-detail">
        <div className="movie-detail-poster">{getGenreEmoji(movie.genre)}</div>
        <div>
          <h1>{movie.title}</h1>
          <div className="movie-meta">{movie.director} · {movie.year} · {movie.genre}</div>
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

          {user ? (
            <form method="POST" action={`/movies/${movieId}/reviews`} className="review-form">
              <h3>✍️ Write a Review</h3>
              <div className="star-input">
                {[1,2,3,4,5,6,7,8,9,10].map(n => (
                  <label key={n} className="star-label">
                    <input type="radio" name="rating" value={n} required />
                    <span>★</span>
                  </label>
                ))}
              </div>
              <input type="text" name="comment" placeholder="What did you think?" />
              <button type="submit" className="btn btn-primary">Submit Review</button>
            </form>
          ) : (
            <p className="login-prompt"><a href="/login">Login</a> to write a review.</p>
          )}

          <h3 className="reviews-title">📝 Reviews</h3>
          {reviews.length > 0 ? reviews.map((review) => (
            <div key={review.id} className="review-item">
              <div className="review-header">
                <span className="review-user">{review.user?.username || 'Anonymous'}</span>
                <span className="review-stars">{'⭐'.repeat(review.rating)}</span>
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
  );
}, 'MovieDetailPage');

/**
 * Login Page — server component
 */
const LoginPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <div className="container">
      <div className="auth-container">
        <div className="card">
          <div className="card-header"><h2>Welcome Back</h2></div>
          <div className="card-body">
            {error && <div className="error-msg">{error}</div>}
            <form method="POST" action="/auth/login">
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" required placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" required placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">🔑 Login</button>
            </form>
            <div className="switch-auth">
              Don't have an account? <a href="/register">Register</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, 'LoginPage');

/**
 * Register Page — server component
 */
const RegisterPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <div className="container">
      <div className="auth-container">
        <div className="card">
          <div className="card-header"><h2>Create Account</h2></div>
          <div className="card-body">
            {error && <div className="error-msg">{error}</div>}
            <form method="POST" action="/auth/register">
              <div className="form-group">
                <label>Username</label>
                <input type="text" name="username" required placeholder="moviefan42" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" name="email" required placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" name="password" required placeholder="••••••••" />
              </div>
              <button type="submit" className="btn btn-primary btn-block">🚀 Register</button>
            </form>
            <div className="switch-auth">
              Already have an account? <a href="/login">Login</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}, 'RegisterPage');

/**
 * Profile Page — server component (protected)
 */
const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) {
    return <div className="container"><p>Please <a href="/login">login</a> first.</p></div>;
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .orderBy('-watchedAt')
    .all();

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h2>📋 {ctx.user.username}'s Watched Movies</h2>
        </div>
        <div className="card-body">
          {reviews.length === 0 ? (
            <p className="empty-state">No movies watched yet. Go browse and add some!</p>
          ) : (
            reviews.map((review) => (
              <div key={review.id} className="watched-item">
                <div className="watched-poster">{getGenreEmoji(review.movie?.genre)}</div>
                <div className="watched-info">
                  <h3>{review.movie?.title || 'Unknown'}</h3>
                  <div className="watched-meta">
                    Watched {new Date(review.watchedAt).toLocaleDateString()}
                  </div>
                  {review.comment && <div className="watched-comment">{review.comment}</div>}
                </div>
                <div className="watched-rating">{'⭐'.repeat(review.rating)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}, 'ProfilePage');

// ─── Register SSR Pages ──────────────────────────────────────────────────────

app.page('/', MovieListPage, { title: '🎬 CineLog — Movie Tracker' });
app.page('/movies/:id', MovieDetailPage, { title: 'Movie Detail — CineLog' });
app.page('/login', LoginPage, { title: 'Login — CineLog' });
app.page('/register', RegisterPage, { title: 'Register — CineLog' });
app.page('/profile', ProfilePage, { title: 'My Profile — CineLog' });

// ─── Auth Routes (POST handlers) ─────────────────────────────────────────────

app.app.post('/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    const existing = await ModelManager.objects(User).filter({ email }).first();
    if (existing) {
      return res.redirect('/register?error=Email+already+registered');
    }

    const hashedPassword = await hashPassword(password);
    const user = await ModelManager.create(User, {
      username,
      email,
      password: hashedPassword,
    });

    // Send welcome email in background
    await sendWelcomeEmail(user.id);

    // Login via session
    (req as any).login({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    res.redirect('/');
  } catch (error) {
    res.redirect(`/register?error=${encodeURIComponent((error as Error).message)}`);
  }
});

app.app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await ModelManager.objects(User).filter({ email }).first();
    if (!user) {
      return res.redirect('/login?error=Invalid+credentials');
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.redirect('/login?error=Invalid+credentials');
    }

    // Login via session
    (req as any).login({
      userId: user.id,
      email: user.email,
      username: user.username,
    });

    res.redirect('/');
  } catch (error) {
    res.redirect(`/login?error=${encodeURIComponent((error as Error).message)}`);
  }
});

app.app.get('/auth/logout', (req, res) => {
  (req as any).logout();
  res.redirect('/');
});

// ─── Review Submission (POST) ────────────────────────────────────────────────

app.app.post('/movies/:id/reviews', async (req, res) => {
  const session = (req as any).session;
  if (!session) {
    return res.redirect('/login');
  }

  try {
    const movieId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    await ModelManager.create(Review, {
      movieId,
      userId: session.userId,
      rating: parseInt(rating),
      comment,
      watchedAt: new Date(),
    });

    res.redirect(`/movies/${movieId}`);
  } catch (error) {
    res.redirect(`/movies/${req.params.id}?error=${encodeURIComponent((error as Error).message)}`);
  }
});

// ─── Start Server ────────────────────────────────────────────────────────────

app.start().then(() => {
  console.log('');
  console.log('🎬 CineLog (SSR) running!');
  console.log('   🌐 App:    http://localhost:3000');
  console.log('   👤 Admin:  http://localhost:3000/api/admin');
  console.log('');
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getGenreEmoji(genre?: string) {
  const map: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
  };
  return genre ? map[genre] || '🎬' : '🎬';
}
