/**
 * Reacto Example App — Full-featured blog
 *
 * Features demonstrated:
 *   - Models with relations (@ForeignKey, @OneToMany)
 *   - Field validators (required, minLength, email)
 *   - Signals (pre_save, post_save)
 *   - Auth middleware (JWT)
 *   - Eager loading (.with())
 *   - Nested routes
 *   - Cascade delete
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
  preSave,
  postSave,
  required,
  minLength,
  maxLength,
  email as emailValidator,
} from '@reacto/core';
import type { Id } from '@reacto/core';
import {
  createServer,
  authMiddleware,
  requireAuth,
  signJwt,
} from '@reacto/server';

// ─── Models ───────────────────────────────────────────────────────────────────

@Model()
class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true, validators: [required(), minLength(3)] })
  username: string;

  @Field({ type: 'email', validators: [required(), emailValidator()] })
  email: string;

  @Field({ type: 'string', maxLength: 255, validators: [required(), minLength(8)] })
  password: string;

  @Field({ type: 'boolean', default: true })
  isActive: boolean;

  @Field({ type: 'boolean', default: false })
  isStaff: boolean;

  @OneToMany(() => Post, { mappedBy: 'author' })
  posts: Post[];
}

@Model()
class Post extends Model {
  @Field({ type: 'string', maxLength: 255, validators: [required(), minLength(1)] })
  title: string;

  @Field({ type: 'text', validators: [required()] })
  content: string;

  @Field({ type: 'boolean', default: false })
  published: boolean;

  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  author: Id<User>;
}

// ─── Signals ──────────────────────────────────────────────────────────────────

// Hash password before saving (in real app, use bcrypt)
preSave(User, async (user) => {
  const u = user as any;
  if (u.password && !u.password.startsWith('$2b$')) {
    u.password = `hashed_${u.password}`;
    console.log(`[Signal] Password hashed for user: ${u.username}`);
  }
});

// Log after saving
postSave(User, async (user) => {
  const u = user as any;
  console.log(`[Signal] User saved: ${u.username} (id: ${u.id})`);
});

// ─── App ──────────────────────────────────────────────────────────────────────

async function main() {
  configureDatabase({
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432'),
    database: process.env.DB_NAME ?? 'reacto_example',
    user: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
  });

  console.log('\n📦 Running migrations...\n');
  const migrations = await generateMigrations();
  await applyMigrations(migrations);

  const app = createServer({
    basePath: '/api',
    cors: { origin: '*' },
  });

  // Add auth middleware
  const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-key-change-me';
  app.use(authMiddleware({ secret: JWT_SECRET }));

  // Login endpoint (generates JWT)
  app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    try {
      const user = await ModelManager.objects(User).get({ username });
      if ((user as any).password !== `hashed_${password}`) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = signJwt({ sub: user.id, username }, JWT_SECRET, 86400);
      res.json({ token, user: user.toJSON() });
    } catch {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Protected endpoint example
  app.get('/api/auth/me', requireAuth(), async (req, res) => {
    const user = await ModelManager.objects(User).get({ id: Number(req.user!.sub) });
    res.json({ user: user.toJSON() });
  });

  const port = parseInt(process.env.PORT ?? '3000');
  app.listen(port, () => {
    console.log(`\n⚡ Reacto example running at http://localhost:${port}`);
    console.log(`\n📡 API Endpoints:`);
    console.log(`   POST   /api/auth/login         → Login (get JWT)`);
    console.log(`   GET    /api/auth/me             → Current user (protected)`);
    console.log(`   GET    /api/users?with=posts    → List users with posts`);
    console.log(`   GET    /api/posts?with=author   → List posts with author`);
    console.log(`   GET    /api/users/:id/posts     → User's posts`);
    console.log(`   POST   /api/users/:id/posts     → Create post for user`);
    console.log(`   GET    /api/posts/:id/author    → Post's author`);
    console.log(`   DELETE /api/users/:id           → Cascade delete\n`);
  });
}

main().catch(console.error);
