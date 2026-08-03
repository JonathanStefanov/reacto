/**
 * Seed script — populates the movie app with sample data
 *
 * Run: npx tsx examples/movie-app/seed.ts
 */
import {
  configureDatabase,
  ModelManager,
  autoConfigure,
  closePool,
} from '@reacto-org/core';
import { hashPassword } from '@reacto-org/server';
import { User, Movie, Review, ChatMessage } from './models.js';

configureDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movieapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('🌱 Seeding database...\n');

  // ─── Users ────────────────────────────────────────────────────────────

  const users = await Promise.all([
    ModelManager.create(User, {
      username: 'cinephile',
      email: 'cine@example.com',
      password: await hashPassword('password123'),
      bio: 'I watch everything. Yes, even that.',
    }),
    ModelManager.create(User, {
      username: 'horrorfan',
      email: 'horror@example.com',
      password: await hashPassword('password123'),
      bio: 'If it has jump scares, I\'m in.',
    }),
    ModelManager.create(User, {
      username: 'dramaqueen',
      email: 'drama@example.com',
      password: await hashPassword('password123'),
      bio: 'Make me cry and I\'ll give you 5 stars.',
    }),
    ModelManager.create(User, {
      username: 'scifigeek',
      email: 'scifi@example.com',
      password: await hashPassword('password123'),
      bio: 'The future is now, old man.',
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // ─── Movies ───────────────────────────────────────────────────────────

  const movies = await Promise.all([
    ModelManager.create(Movie, {
      title: 'Inception',
      description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.',
      director: 'Christopher Nolan',
      year: 2010,
      genre: 'Sci-Fi',
    }),
    ModelManager.create(Movie, {
      title: 'The Shawshank Redemption',
      description: 'Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency.',
      director: 'Frank Darabont',
      year: 1994,
      genre: 'Drama',
    }),
    ModelManager.create(Movie, {
      title: 'The Dark Knight',
      description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.',
      director: 'Christopher Nolan',
      year: 2008,
      genre: 'Action',
    }),
    ModelManager.create(Movie, {
      title: 'Pulp Fiction',
      description: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine in four tales of violence and redemption.',
      director: 'Quentin Tarantino',
      year: 1994,
      genre: 'Thriller',
    }),
    ModelManager.create(Movie, {
      title: 'The Conjuring',
      description: 'Paranormal investigators Ed and Lorraine Warren work to help a family terrorized by a dark presence in their farmhouse.',
      director: 'James Wan',
      year: 2013,
      genre: 'Horror',
    }),
    ModelManager.create(Movie, {
      title: 'Interstellar',
      description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
      director: 'Christopher Nolan',
      year: 2014,
      genre: 'Sci-Fi',
    }),
    ModelManager.create(Movie, {
      title: 'The Grand Budapest Hotel',
      description: 'A writer encounters the owner of an aging high-class hotel, who tells him of his early years serving as a lobby boy.',
      director: 'Wes Anderson',
      year: 2014,
      genre: 'Comedy',
    }),
    ModelManager.create(Movie, {
      title: 'Parasite',
      description: 'Greed and class discrimination threaten the newly formed symbiotic relationship between the wealthy Park family and the destitute Kim clan.',
      director: 'Bong Joon-ho',
      year: 2019,
      genre: 'Thriller',
    }),
    ModelManager.create(Movie, {
      title: 'La La Land',
      description: 'While navigating their careers in Los Angeles, a pianist and an actress fall in love while attempting to reconcile their aspirations for the future.',
      director: 'Damien Chazelle',
      year: 2016,
      genre: 'Romance',
    }),
    ModelManager.create(Movie, {
      title: 'Planet Earth II',
      description: 'David Attenborough returns with a new wildlife documentary that shows life in a variety of habitats.',
      director: 'David Attenborough',
      year: 2016,
      genre: 'Documentary',
    }),
  ]);

  console.log(`✅ Created ${movies.length} movies`);

  // ─── Reviews ──────────────────────────────────────────────────────────

  const reviews = await Promise.all([
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[0].id, rating: 9, comment: 'Mind-bending masterpiece. The ending still haunts me.', watchedAt: new Date('2024-01-15') }),
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[3].id, rating: 10, comment: 'Nolan at his absolute best. The zero gravity scene is iconic.', watchedAt: new Date('2024-02-20') }),
    ModelManager.create(Review, { movieId: movies[1].id, userId: users[2].id, rating: 10, comment: 'I cried. A lot. Perfect film.', watchedAt: new Date('2024-03-10') }),
    ModelManager.create(Review, { movieId: movies[1].id, userId: users[0].id, rating: 9, comment: 'Hope is a good thing, maybe the best of things.', watchedAt: new Date('2024-01-20') }),
    ModelManager.create(Review, { movieId: movies[2].id, userId: users[0].id, rating: 9, comment: 'Heath Ledger\'s Joker is unforgettable.', watchedAt: new Date('2024-04-05') }),
    ModelManager.create(Review, { movieId: movies[2].id, userId: users[1].id, rating: 8, comment: 'Great action, great villain. What more do you need?', watchedAt: new Date('2024-04-10') }),
    ModelManager.create(Review, { movieId: movies[3].id, userId: users[0].id, rating: 8, comment: 'Tarantino\'s dialogue is unmatched.', watchedAt: new Date('2024-05-01') }),
    ModelManager.create(Review, { movieId: movies[4].id, userId: users[1].id, rating: 7, comment: 'Actually scary! Rare for modern horror.', watchedAt: new Date('2024-06-13') }),
    ModelManager.create(Review, { movieId: movies[5].id, userId: users[3].id, rating: 10, comment: 'The docking scene is peak cinema. Hans Zimmer went crazy.', watchedAt: new Date('2024-07-20') }),
    ModelManager.create(Review, { movieId: movies[5].id, userId: users[0].id, rating: 9, comment: 'Makes you think about time, love, and humanity.', watchedAt: new Date('2024-07-25') }),
    ModelManager.create(Review, { movieId: movies[6].id, userId: users[2].id, rating: 8, comment: 'Wes Anderson\'s most charming film. Every frame is art.', watchedAt: new Date('2024-08-01') }),
    ModelManager.create(Review, { movieId: movies[7].id, userId: users[0].id, rating: 10, comment: 'A genre-defying masterpiece. Deserved every award.', watchedAt: new Date('2024-09-15') }),
    ModelManager.create(Review, { movieId: movies[7].id, userId: users[2].id, rating: 9, comment: 'The twist genuinely shocked me.', watchedAt: new Date('2024-09-20') }),
    ModelManager.create(Review, { movieId: movies[8].id, userId: users[2].id, rating: 8, comment: 'Beautiful. The ending broke me.', watchedAt: new Date('2024-10-01') }),
    ModelManager.create(Review, { movieId: movies[9].id, userId: users[0].id, rating: 9, comment: 'Stunning visuals. Nature is incredible.', watchedAt: new Date('2024-11-05') }),
  ]);

  console.log(`✅ Created ${reviews.length} reviews`);

  // ─── Chat Messages ────────────────────────────────────────────────────

  const messages = await Promise.all([
    ModelManager.create(ChatMessage, { userId: users[0].id, content: 'Hey everyone! Just watched Inception again. Still holds up!', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[3].id, content: 'Have you seen Interstellar? Same director, even better IMO', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[0].id, content: 'Oh yeah, Interstellar is incredible. The docking scene 🚀', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[1].id, content: 'Anyone else watch The Conjuring? Couldn\'t sleep after 😅', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[2].id, content: 'I only watch things that make me cry, thanks', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[0].id, content: 'Parasite was a wild ride. No spoilers but that ending...', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[3].id, content: 'Bong Joon-ho is a genius. Have you seen Memories of Murder?', channel: 'general' }),
  ]);

  console.log(`✅ Created ${messages.length} chat messages`);

  console.log('\n🎉 Seed complete!\n');
  console.log('Test accounts:');
  console.log('  Email: cine@example.com  | Password: password123');
  console.log('  Email: horror@example.com | Password: password123');
  console.log('  Email: drama@example.com  | Password: password123');
  console.log('  Email: scifi@example.com  | Password: password123');
  console.log('');

  await closePool();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
