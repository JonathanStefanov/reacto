/**
 * Movie App — Full-featured Reacto example
 *
 * Demonstrates: ORM, relations, validators, signals, auth, WebSocket,
 * file uploads, search, caching, background tasks, and admin dashboard.
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
  createServer,
  authMiddleware,
  requireRole,
  signJwt,
  hashPassword,
  verifyPassword,
  uploadMiddleware,
} from '@reacto-org/server';
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
    // Simulate email sending
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`✅ Welcome email sent to ${user.email}`);
    return { sent: true, email: user.email };
  },
  { queue: 'emails', retries: 3 }
);

const processMoviePoster = createTask(
  'processMoviePoster',
  async (movieId: number, filePath: string) => {
    console.log(`🖼️ Processing poster for movie ${movieId}: ${filePath}`);
    // Simulate image processing (resize, optimize, etc.)
    await new Promise((r) => setTimeout(r, 2000));
    const movie = await ModelManager.objects(Movie).get({ id: movieId });
    movie.posterUrl = `/uploads/${filePath}`;
    await movie.save();
    console.log(`✅ Poster processed for "${movie.title}"`);
    return { movieId, posterUrl: movie.posterUrl };
  },
  { queue: 'images', retries: 2 }
);

// ─── Create Server ───────────────────────────────────────────────────────────

const { app, server, ws } = createServer({
  basePath: '/api',
  websocket: true,
  admin: true,
  cors: {
    origin: '*',
    credentials: true,
  },
});

// ─── Auth Routes ─────────────────────────────────────────────────────────────

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existing = await ModelManager.objects(User).filter({ email }).first();
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Create user (password hashed via signal)
    const user = await ModelManager.create(User, {
      username,
      email,
      password,
    });

    // Send welcome email in background
    await sendWelcomeEmail(user.id);

    const token = signJwt({ userId: user.id, email: user.email });
    res.json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await ModelManager.objects(User).filter({ email }).first();
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = signJwt({ userId: user.id, email: user.email });
    res.json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    const user = await ModelManager.objects(User).get({ id: req.user.userId });
    res.json({ user: user.toJSON() });
  } catch {
    res.status(404).json({ error: 'User not found' });
  }
});

// ─── Movie Routes ────────────────────────────────────────────────────────────

app.get('/api/movies', async (req, res) => {
  try {
    const { search, genre, year, sort, page = '1', pageSize = '20' } = req.query;
    let qs = ModelManager.objects(Movie);

    // Search by title, director, or description
    if (search) {
      qs = qs.search(
        ['title', 'director', 'description'],
        search as string
      );
    }

    // Filter by genre
    if (genre) {
      qs = qs.filter({ genre });
    }

    // Filter by year
    if (year) {
      qs = qs.filter({ year: parseInt(year as string) });
    }

    // Sort
    if (sort) {
      qs = qs.orderBy(sort as string);
    } else {
      qs = qs.orderBy('-averageRating');
    }

    // Paginate
    const p = parseInt(page as string);
    const ps = parseInt(pageSize as string);
    const total = await qs.count();
    const movies = await qs.paginate(p, ps).cache(60).all();

    res.json({
      data: movies.map((m) => m.toJSON()),
      pagination: {
        page: p,
        pageSize: ps,
        total,
        totalPages: Math.ceil(total / ps),
      },
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.get('/api/movies/:id', async (req, res) => {
  try {
    const movie = await ModelManager.objects(Movie)
      .with('reviews')
      .get({ id: parseInt(req.params.id) });

    // Load user info for each review
    const reviews = await ModelManager.objects(Review)
      .filter({ movieId: movie.id })
      .with('user')
      .all();

    res.json({
      movie: {
        ...movie.toJSON(),
        reviews: reviews.map((r) => r.toJSON()),
      },
    });
  } catch {
    res.status(404).json({ error: 'Movie not found' });
  }
});

app.post('/api/movies', authMiddleware, async (req, res) => {
  try {
    const movie = await ModelManager.create(Movie, req.body);

    // Process poster in background if provided
    if (req.body.posterUrl) {
      await processMoviePoster(movie.id, req.body.posterUrl);
    }

    res.json({ movie: movie.toJSON() });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.put('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const movie = await ModelManager.objects(Movie).get({
      id: parseInt(req.params.id),
    });

    Object.assign(movie, req.body);
    await movie.save();

    res.json({ movie: movie.toJSON() });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.delete('/api/movies/:id', authMiddleware, async (req, res) => {
  try {
    const movie = await ModelManager.objects(Movie).get({
      id: parseInt(req.params.id),
    });
    await movie.delete();
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── Review Routes ───────────────────────────────────────────────────────────

app.get('/api/movies/:movieId/reviews', async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const reviews = await ModelManager.objects(Review)
      .filter({ movieId })
      .with('user')
      .orderBy('-createdAt')
      .all();

    res.json({ reviews: reviews.map((r) => r.toJSON()) });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

app.post('/api/movies/:movieId/reviews', authMiddleware, async (req, res) => {
  try {
    const movieId = parseInt(req.params.movieId);
    const userId = req.user.userId;

    // Check for existing review
    const existing = await ModelManager.objects(Review)
      .filter({ movieId, userId })
      .first();

    if (existing) {
      return res.status(400).json({ error: 'You already reviewed this movie' });
    }

    const review = await ModelManager.create(Review, {
      movieId,
      userId,
      rating: req.body.rating,
      comment: req.body.comment,
      watchedAt: req.body.watchedAt || new Date(),
    });

    // Broadcast new review via WebSocket
    if (ws) {
      ws.broadcast('new-review', {
        movieId,
        review: review.toJSON(),
      });
    }

    res.json({ review: review.toJSON() });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── User's Watched Movies ───────────────────────────────────────────────────

app.get('/api/users/me/watched', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.userId;
    const reviews = await ModelManager.objects(Review)
      .filter({ userId })
      .with('movie')
      .orderBy('-watchedAt')
      .all();

    res.json({
      watched: reviews.map((r) => ({
        ...r.toJSON(),
        movie: r.movie?.toJSON(),
      })),
    });
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
});

// ─── Chat (WebSocket) ────────────────────────────────────────────────────────

if (ws) {
  // Load recent chat history on connect
  ws.on('connection', async (client) => {
    try {
      const messages = await ModelManager.objects(ChatMessage)
        .with('user')
        .orderBy('-createdAt')
        .limit(50)
        .all();

      client.send('chat-history', {
        messages: messages.reverse().map((m) => m.toJSON()),
      });
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  });

  // Handle incoming chat messages
  ws.on('chat-message', async (data, client) => {
    try {
      const { content, channel = 'general' } = data;
      const userId = client.userId;

      if (!userId) {
        return client.send('error', { message: 'Not authenticated' });
      }

      const message = await ModelManager.create(ChatMessage, {
        userId,
        content,
        channel,
      });

      // Load user info
      const user = await ModelManager.objects(User).get({ id: userId });

      // Broadcast to all clients
      ws.broadcast('chat-message', {
        ...message.toJSON(),
        user: user.toJSON(),
      });
    } catch (error) {
      client.send('error', { message: (error as Error).message });
    }
  });
}

// ─── Serve Static Files ──────────────────────────────────────────────────────

app.use('/uploads', express.static('uploads'));

// Serve React client (production build)
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, 'client/dist')));
app.get('*', (_req, res) => {
  res.sendFile(join(__dirname, 'client/dist/index.html'));
});

// ─── Start Server ────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT || '3000');

server.listen(PORT, () => {
  console.log('');
  console.log('🎬 Movie App running!');
  console.log(`   🌐 App:    http://localhost:${PORT}`);
  console.log(`   📡 API:    http://localhost:${PORT}/api`);
  console.log(`   🔌 WS:     ws://localhost:${PORT}/ws`);
  console.log(`   👤 Admin:  http://localhost:${PORT}/admin`);
  console.log('');
});

// Import express for static files
import express from 'express';
