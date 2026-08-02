/**
 * Reacto Basic Example — Blog with relations, validators, signals, auth
 */
import 'reflect-metadata';
import {
  Model,
  ModelDecor,
  Field,
  ForeignKey,
  OneToMany,
  Signal,
  configureDatabase,
  ModelManager,
} from '@reacto/core';
import {
  required,
  minLength,
  maxLength,
  email,
} from '@reacto/core/src/validators/index.js';
import { runSignal } from '@reacto/core/src/signals/index.js';
import {
  signJwt,
  verifyJwt,
  authMiddleware,
  hashPassword,
  verifyPassword,
} from '@reacto/server/src/middleware/auth.js';
import { createServer, startServer } from '@reacto/server';

// ─── Database ─────────────────────────────────────────────────────────────────

configureDatabase({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'reacto_example',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
});

// ─── Models ───────────────────────────────────────────────────────────────────

@ModelDecor({ tableName: 'users' })
class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true, validators: [required(), minLength(3)] })
  username!: string;

  @Field({ type: 'email', validators: [required(), email()] })
  email!: string;

  @Field({ type: 'string', nullable: true })
  passwordHash?: string;

  @Field({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Post, 'author')
  posts!: Post[];

  @Signal('preSave')
  async hashPassword() {
    if (this.passwordHash && !this.passwordHash.startsWith('scrypt:')) {
      this.passwordHash = await hashPassword(this.passwordHash);
    }
  }
}

@ModelDecor({ tableName: 'posts' })
class Post extends Model {
  @Field({ type: 'string', maxLength: 200, validators: [required(), minLength(5)] })
  title!: string;

  @Field({ type: 'text', validators: [required()] })
  content!: string;

  @Field({ type: 'boolean', default: true })
  published!: boolean;

  @ForeignKey(() => User, { inverseSide: 'posts', onDelete: 'CASCADE' })
  authorId!: number;

  author?: User;
}

@ModelDecor({ tableName: 'comments' })
class Comment extends Model {
  @Field({ type: 'text', validators: [required(), minLength(1)] })
  body!: string;

  @ForeignKey(() => Post, { onDelete: 'CASCADE' })
  postId!: number;

  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  userId!: number;
}

// ─── Usage Examples ───────────────────────────────────────────────────────────

async function main() {
  // Create a user
  const user = await ModelManager.create(User, {
    username: 'alice',
    email: 'alice@example.com',
    passwordHash: 'secret123', // Will be hashed by preSave signal
  });
  console.log('Created user:', user.toJSON());

  // Create posts
  const post1 = await ModelManager.create(Post, {
    title: 'Hello World',
    content: 'My first post!',
    authorId: user.id,
  });

  const post2 = await ModelManager.create(Post, {
    title: 'Second Post',
    content: 'More great content.',
    authorId: user.id,
  });

  // Eager load: get user with all posts
  const userWithPosts = await ModelManager.objects(User)
    .with('posts')
    .get({ id: user.id });
  console.log('User with posts:', userWithPosts.toJSON());

  // Filter posts
  const myPosts = await ModelManager.objects(Post)
    .filter({ authorId: user.id })
    .orderBy('-createdAt')
    .all();
  console.log('My posts:', myPosts.length);

  // Pagination
  const page1 = await ModelManager.objects(Post)
    .paginate(1, 10)
    .all();
  console.log('Page 1:', page1.length);

  // Cascade delete: deleting user deletes their posts
  await user.delete();
  const remainingPosts = await ModelManager.objects(Post).count();
  console.log('Posts after user deletion:', remainingPosts); // 0

  // JWT Auth
  const token = signJwt({ sub: 1, email: 'alice@example.com' }, 'my-secret');
  const payload = verifyJwt(token, 'my-secret');
  console.log('JWT payload:', payload);

  // Password verification
  const hash = await hashPassword('my-password');
  console.log('Valid password:', await verifyPassword('my-password', hash));
  console.log('Wrong password:', await verifyPassword('wrong', hash));

  // Validation error handling
  try {
    await ModelManager.create(User, { username: '', email: 'bad-email' });
  } catch (err) {
    if (err instanceof Error && err.name === 'ValidationError') {
      console.log('Validation errors:', (err as { errors: unknown }).errors);
    }
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { User, Post, Comment };
