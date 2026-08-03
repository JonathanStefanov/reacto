/**
 * 🎬 CineLog — Movie Tracker
 *
 * Django-style Reacto project.
 *
 * Structure:
 *   models/     — Database models (User, Movie, Review, ChatMessage)
 *   views/      — Server components (pages)
 *   routes/     — URL routing + form handlers
 *   tasks/      — Background jobs
 *   templates/  — Layout components
 *   public/     — Static files
 *
 * Run:
 *   createdb movieapp
 *   npx tsx examples/movie-app/seed.ts
 *   npx tsx examples/movie-app/server.ts
 */
import { configureDatabase, configureCache } from '@reacto-org/core';
import { createSSRApp } from '@reacto-org/ssr';

// Register models
import './models/index.js';

// Views (server components)
import { HomePage, MovieDetailPage, LoginPage, RegisterPage, ProfilePage } from './views/index.js';

// Routes (form handlers)
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
  secret: process.env.SESSION_SECRET || 'cinelog-secret-change-me',
  static: ['./examples/movie-app/public'],
  port: parseInt(process.env.PORT || '3000'),
});

// ─── Register Pages ──────────────────────────────────────────────────────────

app.page('/', HomePage, { title: '🎬 CineLog' });
app.page('/movies/:id', MovieDetailPage, { title: 'Movie — CineLog' });
app.page('/login', LoginPage, { title: 'Login — CineLog' });
app.page('/register', RegisterPage, { title: 'Register — CineLog' });
app.page('/profile', ProfilePage, { title: 'Profile — CineLog' });

// ─── Register Routes ─────────────────────────────────────────────────────────

registerRoutes(app.app);

// ─── Start ───────────────────────────────────────────────────────────────────

app.start().then(() => {
  console.log('');
  console.log('🎬 CineLog — http://localhost:3000');
  console.log('');
  console.log('   models/     User, Movie, Review, ChatMessage');
  console.log('   views/      Server components (pages)');
  console.log('   routes/     Auth, reviews, chat API');
  console.log('   tasks/      Welcome email');
  console.log('   templates/  Layout');
  console.log('');
});
