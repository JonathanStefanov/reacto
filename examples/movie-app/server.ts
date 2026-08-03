/**
 * 🎬 CineLog — Movie Tracker
 *
 * That's it. That's the whole server file.
 * Models, views, routes, tasks are auto-discovered.
 */
import { createSSRApp } from '@reacto-org/ssr';

await createSSRApp({
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'movieapp',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  },
  secret: process.env.SESSION_SECRET || 'cinelog-secret',
  port: parseInt(process.env.PORT || '3000'),
});
