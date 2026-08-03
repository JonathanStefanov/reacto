/**
 * Routes — auto-discovered and mounted
 *
 * Export route() definitions. Framework mounts them automatically.
 */
import { route, ModelManager } from '@reacto-org/ssr';
import { User, Review } from '../models/index.js';

// ─── Auth ────────────────────────────────────────────────────────────────────

export const register = route('post', '/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const existing = await ModelManager.objects(User).filter({ email }).first();
    if (existing) return res.redirect('/registerpage?error=Email+already+registered');

    const user = await ModelManager.create(User, { username, email, password });
    (req as any).login({ userId: user.id, email: user.email, username: user.username });
    res.redirect('/');
  } catch (error) {
    res.redirect(`/registerpage?error=${encodeURIComponent((error as Error).message)}`);
  }
});

export const login = route('post', '/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await ModelManager.objects(User).filter({ email }).first();
    if (!user) return res.redirect('/loginpage?error=Invalid+credentials');

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.redirect('/loginpage?error=Invalid+credentials');

    (req as any).login({ userId: user.id, email: user.email, username: user.username });
    res.redirect('/');
  } catch (error) {
    res.redirect(`/loginpage?error=${encodeURIComponent((error as Error).message)}`);
  }
});

export const logout = route('get', '/auth/logout', (req, res) => {
  (req as any).logout();
  res.redirect('/');
});

// ─── Reviews ─────────────────────────────────────────────────────────────────

export const createReview = route('post', '/api/reviews', async (req, res) => {
  const session = (req as any).session;
  if (!session) return res.redirect('/loginpage');

  try {
    const { movieId, rating, comment } = req.body;

    const existing = await ModelManager.objects(Review)
      .filter({ movieId: parseInt(movieId), userId: session.userId }).first();
    if (existing) return res.redirect(`/moviedetailpage?id=${movieId}&error=Already+reviewed`);

    await ModelManager.create(Review, {
      movieId: parseInt(movieId),
      userId: session.userId,
      rating: parseInt(rating),
      comment,
      watchedAt: new Date(),
    });

    res.redirect(`/moviedetailpage?id=${movieId}`);
  } catch (error) {
    res.redirect(`/moviedetailpage?id=${req.body.movieId}&error=${encodeURIComponent((error as Error).message)}`);
  }
});
