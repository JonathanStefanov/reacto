/**
 * Views — Server components (pages)
 *
 * Like Django's views.py. Each view is a server component
 * that uses models directly to render a page.
 *
 *   import { Movie, Review } from '../models/index.js';
 *
 *   export const HomePage = serverComponent(async (ctx) => {
 *     const movies = await ModelManager.objects(Movie).all();
 *     return <MovieList movies={movies} />;
 *   });
 */
export { HomePage } from './HomePage.js';
export { MovieDetailPage } from './MovieDetailPage.js';
export { LoginPage } from './LoginPage.js';
export { RegisterPage } from './RegisterPage.js';
export { ProfilePage } from './ProfilePage.js';
