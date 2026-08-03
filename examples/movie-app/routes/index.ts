/**
 * Routes — URL routing and form handlers
 *
 * Like Django's urls.py. Handles POST forms and API endpoints.
 */
import type { Express } from 'express';
import { ModelManager } from '@reacto-org/core';
import { User, Review, ChatMessage } from '../models/index.js';
import { sendWelcomeEmail } from '../tasks/email.js';

export function registerRoutes(app: Express) {

  // ─── Auth ───────────────────────────────────────────────────────────

  app.post('/auth/register', async (req, res) => {
    try {
      const { username, email, password } = req.body;
      const existing = await ModelManager.objects(User).filter({ email }).first();
      if (existing) return res.redirect('/register?error=Email+already+registered');

      const user = await ModelManager.create(User, { username, email, password });
      await sendWelcomeEmail(user.id);
      (req as any).login({ userId: user.id, email: user.email, username: user.username });
      res.redirect('/');
    } catch (error) {
      res.redirect(`/register?error=${encodeURIComponent((error as Error).message)}`);
    }
  });

  app.post('/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await ModelManager.objects(User).filter({ email }).first();
      if (!user) return res.redirect('/login?error=Invalid+credentials');

      const bcrypt = await import('bcryptjs');
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) return res.redirect('/login?error=Invalid+credentials');

      (req as any).login({ userId: user.id, email: user.email, username: user.username });
      res.redirect('/');
    } catch (error) {
      res.redirect(`/login?error=${encodeURIComponent((error as Error).message)}`);
    }
  });

  app.get('/auth/logout', (req, res) => {
    (req as any).logout();
    res.redirect('/');
  });

  // ─── Reviews ────────────────────────────────────────────────────────

  app.post('/movies/:id/reviews', async (req, res) => {
    const session = (req as any).session;
    if (!session) return res.redirect('/login');

    try {
      const movieId = parseInt(req.params.id);
      const { rating, comment } = req.body;

      const existing = await ModelManager.objects(Review)
        .filter({ movieId, userId: session.userId }).first();
      if (existing) return res.redirect(`/movies/${movieId}?error=Already+reviewed`);

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

  // ─── Chat API ───────────────────────────────────────────────────────

  app.get('/api/chat/messages', async (_req, res) => {
    const messages = await ModelManager.objects(ChatMessage)
      .with('user')
      .orderBy('-createdAt')
      .limit(50)
      .all();
    res.json({ messages: messages.reverse().map(m => m.toJSON()) });
  });

  // ─── Auth API (for client.js) ───────────────────────────────────────

  app.get('/api/auth/me', (req, res) => {
    const session = (req as any).session;
    if (!session) return res.status(401).json({ error: 'Not authenticated' });
    res.json({ user: { id: session.userId, email: session.email, username: session.username } });
  });
}
