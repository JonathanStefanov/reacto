# Relations

Define relationships between models using decorators.

## ForeignKey (Many-to-One)

```typescript
import { ForeignKey, Model, Field } from '@reacto-org/core';

@Model({ tableName: 'posts' })
export class Post {
  @Field({ type: 'string' })
  title!: string;

  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  authorId!: number;

  author?: User; // Loaded via eager loading
}
```

**Options:**
- `onDelete`: `'CASCADE'` | `'SET NULL'` | `'RESTRICT'`
- `nullable`: boolean
- `inverseSide`: string (property name on target model)

## One-to-Many

```typescript
@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string' })
  username!: string;

  @OneToMany(() => Post, 'author')
  posts!: Post[];
}
```

## One-to-One

```typescript
@Model({ tableName: 'users' })
export class User {
  @OneToOne(() => Profile, 'user')
  profile?: Profile;
}

@Model({ tableName: 'profiles' })
export class Profile {
  @Field({ type: 'text' })
  bio!: string;

  @OneToOne(() => User, 'profile')
  user?: User;
}
```

## Many-to-One (alias for ForeignKey)

```typescript
@ManyToOne(() => User, { onDelete: 'CASCADE' })
author!: User;
```

## Eager Loading

Load related data in queries:

```typescript
// Load single relation
const posts = await ModelManager.objects(Post)
  .with('author')
  .all();

// Load multiple relations
const users = await ModelManager.objects(User)
  .with('posts', 'profile')
  .all();

// Nested relations
const posts = await ModelManager.objects(Post)
  .with('author.profile')
  .all();
```

## Cascade Delete

```typescript
@ForeignKey(() => User, { onDelete: 'CASCADE' })
userId!: number;

// When user is deleted, all their posts are deleted too
```

## Inverse Side

Access the parent from the child:

```typescript
// Post has ForeignKey to User
const post = await ModelManager.objects(Post)
  .with('author')
  .get({ id: 1 });

console.log(post.author?.username); // 'john'
```
