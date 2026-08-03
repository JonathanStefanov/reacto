/**
 * Seed — populates database with sample data
 * Run: npx tsx examples/movie-app/seed.ts
 */
import { configureDatabase, ModelManager, closePool } from '@reacto-org/core';
import { User, Movie, Review, ChatMessage } from './models/index.js';

configureDatabase({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'movieapp',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function seed() {
  console.log('🌱 Seeding...\n');

  const users = await Promise.all([
    ModelManager.create(User, { username: 'cinephile', email: 'cine@example.com', password: 'password123' }),
    ModelManager.create(User, { username: 'horrorfan', email: 'horror@example.com', password: 'password123' }),
    ModelManager.create(User, { username: 'dramaqueen', email: 'drama@example.com', password: 'password123' }),
    ModelManager.create(User, { username: 'scifigeek', email: 'scifi@example.com', password: 'password123' }),
  ]);

  const movies = await Promise.all([
    ModelManager.create(Movie, { title: 'Inception', description: 'A thief steals corporate secrets through dream-sharing.', director: 'Christopher Nolan', year: 2010, genre: 'Sci-Fi' }),
    ModelManager.create(Movie, { title: 'The Shawshank Redemption', description: 'Two imprisoned men bond over years.', director: 'Frank Darabont', year: 1994, genre: 'Drama' }),
    ModelManager.create(Movie, { title: 'The Dark Knight', description: 'Batman faces the Joker.', director: 'Christopher Nolan', year: 2008, genre: 'Action' }),
    ModelManager.create(Movie, { title: 'Pulp Fiction', description: 'The lives of mob hitmen intertwine.', director: 'Quentin Tarantino', year: 1994, genre: 'Thriller' }),
    ModelManager.create(Movie, { title: 'The Conjuring', description: 'Paranormal investigators help a family.', director: 'James Wan', year: 2013, genre: 'Horror' }),
    ModelManager.create(Movie, { title: 'Interstellar', description: 'Explorers travel through a wormhole.', director: 'Christopher Nolan', year: 2014, genre: 'Sci-Fi' }),
    ModelManager.create(Movie, { title: 'The Grand Budapest Hotel', description: 'A writer encounters a hotel owner.', director: 'Wes Anderson', year: 2014, genre: 'Comedy' }),
    ModelManager.create(Movie, { title: 'Parasite', description: 'Greed and class discrimination.', director: 'Bong Joon-ho', year: 2019, genre: 'Thriller' }),
    ModelManager.create(Movie, { title: 'La La Land', description: 'A pianist and an actress fall in love.', director: 'Damien Chazelle', year: 2016, genre: 'Romance' }),
    ModelManager.create(Movie, { title: 'Planet Earth II', description: 'Life in various habitats.', director: 'David Attenborough', year: 2016, genre: 'Documentary' }),
  ]);

  await Promise.all([
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[0].id, rating: 9, comment: 'Mind-bending.', watchedAt: new Date('2024-01-15') }),
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[3].id, rating: 10, comment: 'Nolan at his best.', watchedAt: new Date('2024-02-20') }),
    ModelManager.create(Review, { movieId: movies[1].id, userId: users[2].id, rating: 10, comment: 'I cried.', watchedAt: new Date('2024-03-10') }),
    ModelManager.create(Review, { movieId: movies[2].id, userId: users[0].id, rating: 9, comment: 'Heath Ledger!', watchedAt: new Date('2024-04-05') }),
    ModelManager.create(Review, { movieId: movies[5].id, userId: users[3].id, rating: 10, comment: 'Peak cinema.', watchedAt: new Date('2024-07-20') }),
    ModelManager.create(Review, { movieId: movies[7].id, userId: users[0].id, rating: 10, comment: 'Masterpiece.', watchedAt: new Date('2024-09-15') }),
  ]);

  await Promise.all([
    ModelManager.create(ChatMessage, { userId: users[0].id, content: 'Just watched Inception again!', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[3].id, content: 'Interstellar is even better!', channel: 'general' }),
  ]);

  console.log(`✅ ${users.length} users, ${movies.length} movies`);
  console.log('\nTest: cine@example.com / password123\n');
  await closePool();
}

seed().catch(err => { console.error('❌', err); process.exit(1); });
