/**
 * Reacto Example App — Blog with relations
 *
 * Shows the Django-style relation API:
 *   @ForeignKey(() => Author)  → creates author_id column
 *   @OneToMany(() => Post)    → reverse relation (no column)
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

  // This is the magic — import Id from User, one decorator creates:
  //   1. `author_id` column (INTEGER)
  //   2. FOREIGN KEY constraint → users(id)
  //   3. Index on author_id
  @ForeignKey(() => User)
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

  // Custom route example
  app.get('/api/posts/by-author/:authorId', async (req, res) => {
    const posts = await ModelManager.objects(Post)
      .filter({ author: parseInt(req.params.authorId), published: true })
      .all();
    res.json({ data: posts.map((p) => p.toJSON()) });
  });

  // Start
  const port = parseInt(process.env.PORT ?? '3000');
  app.listen(port, () => {
    console.log(`\n⚡ Reacto example running at http://localhost:${port}`);
    console.log(`   API: http://localhost:${port}/api/users`);
    console.log(`   API: http://localhost:${port}/api/posts\n`);
  });
}

main().catch(console.error);
