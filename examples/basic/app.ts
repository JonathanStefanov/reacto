/**
 * Reacto Example App — Basic blog with users and posts
 *
 * Run: npx tsx examples/basic/app.ts
 */
import 'reflect-metadata';
import { Model, Field, configureDatabase, ModelManager, generateMigrations, applyMigrations } from '@reacto/core';
import { createServer } from '@reacto/server';

// ─── Models ───────────────────────────────────────────────────────────────────

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

  static meta = {
    tableName: 'users',
    ordering: ['-createdAt'],
  };
}

class Post extends Model {
  @Field({ type: 'string', maxLength: 255 })
  title: string;

  @Field({ type: 'text' })
  content: string;

  @Field({ type: 'boolean', default: false })
  published: boolean;

  @Field({ type: 'integer' })
  authorId: number;

  static meta = {
    tableName: 'posts',
    ordering: ['-createdAt'],
    indexes: [
      { name: 'idx_posts_author', fields: ['author_id'] },
      { name: 'idx_posts_published', fields: ['published'] },
    ],
  };
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
      .filter({ authorId: parseInt(req.params.authorId), published: true })
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
