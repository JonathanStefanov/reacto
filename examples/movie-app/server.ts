/**
 * 🎬 CineLog — Movie Tracker
 *
 * A Django-style Reacto project.
 *
 * Structure:
 *   models/     — Database models (User, Movie, Review, ChatMessage)
 *   views/      — Server components (pages)
 *   routes/     — URL routing and form handlers
 *   tasks/      — Background jobs
 *   templates/  — Layout components
 *   middleware/  — Request middleware
 *   public/     — Static files (CSS, client JS)
 *
 * Run:
 *   createdb movieapp
 *   npx tsx examples/movie-app/seed.ts
 *   npx tsx examples/movie-app/server.ts
 */
import { configureDatabase, configureCache } from '@reacto-org/core';
import { createSSRApp } from '@reacto-org/ssr';

// Models — register all models
import './models/index.js';

// Views — server components
import { HomePage, MovieDetailPage, LoginPage, RegisterPage, ProfilePage } from './views/index.js';

// Routes — form handlers and API
import { registerRoutes } from './routes/index.js';

// ─── Configuration ───────────────────────────────────────────────────────────

configureDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movieapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

configureCache({ memory: { maxSize: 500, defaultTtl: 300 } });

// ─── Create App ──────────────────────────────────────────────────────────────

const app = createSSRApp({
  session: {
    secret: process.env.SESSION_SECRET || 'reacto-movie-app-secret-change-me',
    maxAge: 7 * 24 * 60 * 60,
  },
  static: ['./examples/movie-app/public'],
  port: parseInt(process.env.PORT || '3000'),
});

// ─── Register Pages (views) ──────────────────────────────────────────────────

app.page('/', HomePage, { title: '🎬 CineLog — Movie Tracker' });
app.page('/movies/:id', MovieDetailPage, { title: 'Movie Detail — CineLog' });
app.page('/login', LoginPage, { title: 'Login — CineLog' });
app.page('/register', RegisterPage, { title: 'Register — CineLog' });
app.page('/profile', ProfilePage, { title: 'Profile — CineLog' });

// ─── Register Routes (form handlers, API) ────────────────────────────────────

registerRoutes(app.app);

// ─── Start ───────────────────────────────────────────────────────────────────

app.start().then(() => {
  console.log('');
  console.log('🎬 CineLog — Django-style Reacto App');
  console.log('   🌐 http://localhost:3000');
  console.log('');
  console.log('   Structure:');
  console.log('     models/     — User, Movie, Review, ChatMessage');
  console.log('     views/      — Server components (pages)');
  console.log('     routes/     — Form handlers, API endpoints');
  console.log('     tasks/      — Background jobs (email)');
  console.log('     templates/  — Layout component');
  console.log('     public/     — Static files (CSS, JS)');
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
