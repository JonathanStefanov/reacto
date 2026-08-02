/**
 * Reacto Example App — Blog with relations, eager loading, cascade delete
 *
 * Shows the full Django-style API:
 *   @ForeignKey(() => User)              → creates author_id column
 *   @OneToMany(() => Post, { mappedBy }) → reverse relation
 *   .with('author')                      → eager loading (LEFT JOIN)
 *   CASCADE delete                       → delete posts when user is deleted
 *   GET /api/users/1/posts               → nested route (auto-generated)
 *   POST /api/users/1/posts              → create post via nested route
 *
 * Run: npx tsx examples/basic/app.ts
 */
import 'reflect-metadata';
import {
  Model,
  Field,
  ForeignKey,
  OneToMany,
  configureDatabase,
  ModelManager,
  generateMigrations,
  applyMigrations,
} from '@reacto/core';
import type { Id } from '@reacto/core';
import { createServer } from '@reacto/server';

// ─── Models ───────────────────────────────────────────────────────────────────

// Table name auto-derived: "users"
@Model()
class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true })
  username: string;

  @Field({ type: 'email' })
  email: string;

  @Field({ type: 'string', maxLength: 255 })
  password: string;

  @Field({ type: 'boolean', default: true })
  isActive: boolean;

  @Field({ type: 'boolean', default: false })
  isStaff: boolean;

  // Reverse relation — all posts by this user
  // GET /api/users/:id/posts → list posts
  // POST /api/users/:id/posts → create post with author set
  @OneToMany(() => Post, { mappedBy: 'author' })
  posts: Post[];
}

// Table name auto-derived: "posts"
@Model()
class Post extends Model {
  @Field({ type: 'string', maxLength: 255 })
  title: string;

  @Field({ type: 'text' })
  content: string;

  @Field({ type: 'boolean', default: false })
  published: boolean;

  // This is the magic — one decorator creates:
  //   1. `author_id` column (INTEGER)
  //   2. FOREIGN KEY constraint → users(id) ON DELETE CASCADE
  //   3. Index on author_id
  //   4. GET /api/posts/:id/author → nested route
  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  author: Id<User>;
}

// ─── App ──────────────────────────────────────────────────────────────────────

async function main() {
  // Configure database
  configureDatabase({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    database: process.env.DB_NAME ?? 'reacto_example',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
  });

  // Auto-migrate
  console.log('\n📦 Running migrations...\n');
  const migrations = await generateMigrations();
  await applyMigrations(migrations);

  // Create server
  const app = createServer({
    basePath: '/api',
    cors: { origin: '*' },
  });

  // Start
  const port = parseInt(process.env.PORT ?? '3000');
  app.listen(port, () => {
    console.log(`\n⚡ Reacto example running at http://localhost:${port}`);
    console.log(`\n📡 API Endpoints:`);
    console.log(`   GET    /api/users              → List users`);
    console.log(`   POST   /api/users              → Create user`);
    console.log(`   GET    /api/users/:id           → Get user`);
    console.log(`   GET    /api/users/:id/posts     → List user's posts`);
    console.log(`   POST   /api/users/:id/posts     → Create post for user`);
    console.log(`   GET    /api/posts               → List posts`);
    console.log(`   GET    /api/posts?with=author    → List posts with author`);
    console.log(`   GET    /api/posts/:id/author    → Get post's author`);
    console.log(`   DELETE /api/users/:id           → Delete user (cascades to posts)\n`);
  });
}

main().catch(console.error);
