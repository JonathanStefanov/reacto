/**
 * Seed — Populates database with sample data
 *
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
  console.log(`✅ ${users.length} users`);

  const movies = await Promise.all([
    ModelManager.create(Movie, { title: 'Inception', description: 'A thief steals corporate secrets through dream-sharing technology.', director: 'Christopher Nolan', year: 2010, genre: 'Sci-Fi' }),
    ModelManager.create(Movie, { title: 'The Shawshank Redemption', description: 'Two imprisoned men bond over years finding solace through decency.', director: 'Frank Darabont', year: 1994, genre: 'Drama' }),
    ModelManager.create(Movie, { title: 'The Dark Knight', description: 'Batman faces the Joker in a psychological test of justice.', director: 'Christopher Nolan', year: 2008, genre: 'Action' }),
    ModelManager.create(Movie, { title: 'Pulp Fiction', description: 'The lives of mob hitmen, a boxer, and a gangster intertwine.', director: 'Quentin Tarantino', year: 1994, genre: 'Thriller' }),
    ModelManager.create(Movie, { title: 'The Conjuring', description: 'Paranormal investigators help a family terrorized by a dark presence.', director: 'James Wan', year: 2013, genre: 'Horror' }),
    ModelManager.create(Movie, { title: 'Interstellar', description: 'Explorers travel through a wormhole to ensure humanity survives.', director: 'Christopher Nolan', year: 2014, genre: 'Sci-Fi' }),
    ModelManager.create(Movie, { title: 'The Grand Budapest Hotel', description: 'A writer encounters the owner of an aging high-class hotel.', director: 'Wes Anderson', year: 2014, genre: 'Comedy' }),
    ModelManager.create(Movie, { title: 'Parasite', description: 'Greed and class discrimination threaten a symbiotic relationship.', director: 'Bong Joon-ho', year: 2019, genre: 'Thriller' }),
    ModelManager.create(Movie, { title: 'La La Land', description: 'A pianist and an actress fall in love while pursuing dreams.', director: 'Damien Chazelle', year: 2016, genre: 'Romance' }),
    ModelManager.create(Movie, { title: 'Planet Earth II', description: 'David Attenborough shows life in various habitats.', director: 'David Attenborough', year: 2016, genre: 'Documentary' }),
  ]);
  console.log(`✅ ${movies.length} movies`);

  const reviews = await Promise.all([
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[0].id, rating: 9, comment: 'Mind-bending masterpiece.', watchedAt: new Date('2024-01-15') }),
    ModelManager.create(Review, { movieId: movies[0].id, userId: users[3].id, rating: 10, comment: 'Nolan at his best.', watchedAt: new Date('2024-02-20') }),
    ModelManager.create(Review, { movieId: movies[1].id, userId: users[2].id, rating: 10, comment: 'I cried. A lot.', watchedAt: new Date('2024-03-10') }),
    ModelManager.create(Review, { movieId: movies[2].id, userId: users[0].id, rating: 9, comment: 'Heath Ledger is unforgettable.', watchedAt: new Date('2024-04-05') }),
    ModelManager.create(Review, { movieId: movies[4].id, userId: users[1].id, rating: 7, comment: 'Actually scary!', watchedAt: new Date('2024-06-13') }),
    ModelManager.create(Review, { movieId: movies[5].id, userId: users[3].id, rating: 10, comment: 'The docking scene is peak cinema.', watchedAt: new Date('2024-07-20') }),
    ModelManager.create(Review, { movieId: movies[7].id, userId: users[0].id, rating: 10, comment: 'Deserved every award.', watchedAt: new Date('2024-09-15') }),
    ModelManager.create(Review, { movieId: movies[8].id, userId: users[2].id, rating: 8, comment: 'The ending broke me.', watchedAt: new Date('2024-10-01') }),
    ModelManager.create(Review, { movieId: movies[9].id, userId: users[0].id, rating: 9, comment: 'Nature is incredible.', watchedAt: new Date('2024-11-05') }),
  ]);
  console.log(`✅ ${reviews.length} reviews`);

  const msgs = await Promise.all([
    ModelManager.create(ChatMessage, { userId: users[0].id, content: 'Hey! Just watched Inception again.', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[3].id, content: 'Have you seen Interstellar? Even better!', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[1].id, content: 'Anyone watch The Conjuring? Couldn\'t sleep.', channel: 'general' }),
    ModelManager.create(ChatMessage, { userId: users[2].id, content: 'I only watch things that make me cry.', channel: 'general' }),
  ]);
  console.log(`✅ ${msgs.length} messages`);

  console.log('\n🎉 Done! Test accounts:');
  console.log('   cine@example.com / password123');
  console.log('   horror@example.com / password123\n');

  await closePool();
}

seed().catch(err => { console.error('❌', err); process.exit(1); });
