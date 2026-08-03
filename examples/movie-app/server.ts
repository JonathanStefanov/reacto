/**
 * 🎬 CineLog — Movie Tracker (SSR Version)
 *
 * Server-rendered using Reacto's SSR engine.
 * Models and auth used DIRECTLY in pages — no API layer needed.
 *
 * Run:
 *   createdb movieapp
 *   npx tsx examples/movie-app/seed.ts
 *   npx tsx examples/movie-app/server.ts
 *
 * Then open http://localhost:3000
 */
import {
  configureDatabase,
  configureCache,
  ModelManager,
  createTask,
} from '@reacto-org/core';
import {
  createSSRApp,
  serverComponent,
} from '@reacto-org/ssr';
import { hashPassword } from '@reacto-org/server';
import React from 'react';
import { User, Movie, Review, ChatMessage } from './models.js';

// ─── Configuration ───────────────────────────────────────────────────────────

configureDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movieapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

configureCache({ memory: { maxSize: 500, defaultTtl: 300 } });

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function GenreEmoji({ genre }: { genre?: string }) {
  const map: Record<string, string> = {
    Action: '💥', Comedy: '😂', Drama: '🎭', Horror: '👻',
    'Sci-Fi': '🚀', Romance: '💕', Thriller: '😱', Documentary: '📹',
  };
  return <span>{genre ? map[genre] || '🎬' : '🎬'}</span>;
}

function Stars({ count }: { count: number }) {
  return <span style={{ color: '#f1c40f' }}>{'⭐'.repeat(count)}</span>;
}

// ─── Layout ──────────────────────────────────────────────────────────────────

function Layout({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{title || '🎬 CineLog'}</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <header className="header">
          <h1 className="logo">🎬 <span className="accent">Cine</span>Log</h1>
          <nav className="header-nav" id="nav">
            {/* Navigation is injected by client JS based on auth state */}
          </nav>
        </header>
        <main>{children}</main>
        <script type="module" src="/client.js"></script>
      </body>
    </html>
  );
}

// ─── Server Components ───────────────────────────────────────────────────────

/**
 * Home Page — Movie list with search, filter, pagination
 * Uses ModelManager directly. No API calls.
 */
const HomePage = serverComponent(async (ctx) => {
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
        {/* Search & Filter */}
        <form method="GET" className="search-bar">
          <input
            type="text"
            name="search"
            placeholder="🔍 Search movies..."
            defaultValue={search}
          />
          <select name="genre" defaultValue={genre}>
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
          <button type="submit" className="btn btn-primary">Search</button>
        </form>

        {/* Movie Grid */}
        <div className="movie-grid">
          {movies.map(movie => (
            <a key={movie.id} href={`/movies/${movie.id}`} className="movie-card">
              <div className="movie-poster"><GenreEmoji genre={movie.genre} /></div>
              <div className="movie-info">
                <h3>{movie.title}</h3>
                <div className="movie-meta">{movie.director} · {movie.year}</div>
                <div className="movie-rating">
                  ⭐ {movie.averageRating || '—'} ({movie.reviewCount} reviews)
                </div>
              </div>
            </a>
          ))}
          {movies.length === 0 && (
            <p className="empty-state">No movies found. Try a different search!</p>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            {page > 1 && (
              <a href={`/?page=${page - 1}&search=${search}&genre=${genre}`} className="btn btn-outline">
                ← Prev
              </a>
            )}
            <span>Page {page} of {totalPages}</span>
            {page < totalPages && (
              <a href={`/?page=${page + 1}&search=${search}&genre=${genre}`} className="btn btn-outline">
                Next →
              </a>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}, 'HomePage');

/**
 * Movie Detail Page — shows movie info + reviews
 */
const MovieDetailPage = serverComponent(async (ctx, props) => {
  const movieId = parseInt((props as { id: string }).id);

  let movie: InstanceType<typeof Movie>;
  try {
    movie = await ModelManager.objects(Movie).get({ id: movieId });
  } catch {
    return (
      <Layout title="Movie Not Found">
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

  return (
    <Layout title={`${movie.title} — CineLog`}>
      <div className="container">
        <a href="/" className="btn btn-outline" style={{ marginBottom: '16px' }}>← Back to Movies</a>

        <div className="movie-detail">
          <div className="movie-detail-poster"><GenreEmoji genre={movie.genre} /></div>
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

            {/* Review Form */}
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
              <p className="login-prompt">
                <a href="/login">Login</a> to write a review
              </p>
            )}

            {/* Reviews */}
            <h3 className="reviews-title">📝 Reviews</h3>
            {reviews.length > 0 ? reviews.map(review => (
              <div key={review.id} className="review-item">
                <div className="review-header">
                  <span className="review-user">{review.user?.username || 'Anonymous'}</span>
                  <Stars count={review.rating} />
                </div>
                {review.comment && <p className="review-comment">{review.comment}</p>}
                <span className="review-date">
                  {new Date(review.watchedAt || review.createdAt).toLocaleDateString()}
                </span>
              </div>
            )) : (
              <p className="empty-state">No reviews yet. Be the first!</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'MovieDetailPage');

/**
 * Login Page
 */
const LoginPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <Layout title="Login — CineLog">
      <div className="container">
        <div className="auth-container">
          <div className="card">
            <div className="card-header"><h2>Welcome Back</h2></div>
            <div className="card-body">
              {error && <div className="error-msg">{decodeURIComponent(error)}</div>}
              <form method="POST" action="/auth/login">
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" required placeholder="••••••••" />
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
    </Layout>
  );
}, 'LoginPage');

/**
 * Register Page
 */
const RegisterPage = serverComponent(async (ctx) => {
  const error = ctx.query.error;

  return (
    <Layout title="Register — CineLog">
      <div className="container">
        <div className="auth-container">
          <div className="card">
            <div className="card-header"><h2>Create Account</h2></div>
            <div className="card-body">
              {error && <div className="error-msg">{decodeURIComponent(error)}</div>}
              <form method="POST" action="/auth/register">
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" required placeholder="moviefan42" />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email</label>
                  <input type="email" id="email" name="email" required placeholder="you@example.com" />
                </div>
                <div className="form-group">
                  <label htmlFor="password">Password</label>
                  <input type="password" id="password" name="password" required placeholder="••••••••" />
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
    </Layout>
  );
}, 'RegisterPage');

/**
 * Profile Page — Protected, shows watched movies
 */
const ProfilePage = serverComponent(async (ctx) => {
  if (!ctx.user) {
    return (
      <Layout title="Profile — CineLog">
        <div className="container">
          <p className="empty-state">Please <a href="/login">login</a> to view your profile.</p>
        </div>
      </Layout>
    );
  }

  const reviews = await ModelManager.objects(Review)
    .filter({ userId: ctx.user.id })
    .with('movie')
    .orderBy('-watchedAt')
    .all();

  return (
    <Layout title={`${ctx.user.username}'s Profile — CineLog`}>
      <div className="container">
        <div className="card">
          <div className="card-header">
            <h2>📋 {ctx.user.username}'s Watched Movies</h2>
          </div>
          <div className="card-body">
            {reviews.length === 0 ? (
              <p className="empty-state">
                You haven't watched any movies yet. <a href="/">Browse movies</a> to get started!
              </p>
            ) : (
              reviews.map(review => (
                <div key={review.id} className="watched-item">
                  <div className="watched-poster"><GenreEmoji genre={review.movie?.genre} /></div>
                  <div className="watched-info">
                    <h3><a href={`/movies/${review.movieId}`}>{review.movie?.title || 'Unknown'}</a></h3>
                    <div className="watched-meta">
                      Watched {new Date(review.watchedAt).toLocaleDateString()}
                    </div>
                    {review.comment && <div className="watched-comment">{review.comment}</div>}
                  </div>
                  <div className="watched-rating"><Stars count={review.rating} /></div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}, 'ProfilePage');

// ─── Create App & Register Pages ─────────────────────────────────────────────

const app = createSSRApp({
  session: {
    secret: process.env.SESSION_SECRET || 'reacto-movie-app-secret-change-me',
    maxAge: 7 * 24 * 60 * 60,
  },
  static: ['./examples/movie-app/public', './uploads'],
  port: parseInt(process.env.PORT || '3000'),
});

// SSR pages
app.page('/', HomePage);
app.page('/movies/:id', MovieDetailPage);
app.page('/login', LoginPage);
app.page('/register', RegisterPage);
app.page('/profile', ProfilePage);

// ─── Auth Routes (Form submissions) ──────────────────────────────────────────

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

    await sendWelcomeEmail(user.id);

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

// ─── Review Submission ───────────────────────────────────────────────────────

app.app.post('/movies/:id/reviews', async (req, res) => {
  const session = (req as any).session;
  if (!session) return res.redirect('/login');

  try {
    const movieId = parseInt(req.params.id);
    const { rating, comment } = req.body;

    const existing = await ModelManager.objects(Review)
      .filter({ movieId, userId: session.userId })
      .first();

    if (existing) {
      return res.redirect(`/movies/${movieId}?error=Already+reviewed`);
    }

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

// ─── Chat API (for WebSocket) ────────────────────────────────────────────────

// Load recent messages
app.app.get('/api/chat/messages', async (_req, res) => {
  const messages = await ModelManager.objects(ChatMessage)
    .with('user')
    .orderBy('-createdAt')
    .limit(50)
    .all();

  res.json({ messages: messages.reverse().map(m => m.toJSON()) });
});

// ─── Start ───────────────────────────────────────────────────────────────────

app.start().then(() => {
  console.log('');
  console.log('🎬 CineLog — SSR Movie Tracker');
  console.log('   🌐 http://localhost:3000');
  console.log('');
  console.log('   Pages:');
  console.log('     /           Movie list (search, filter, paginate)');
  console.log('     /movies/:id Movie detail + reviews');
  console.log('     /login      Login');
  console.log('     /register   Register');
  console.log('     /profile    Watched movies (protected)');
  console.log('     /api/admin  Admin dashboard');
  console.log('');
});
