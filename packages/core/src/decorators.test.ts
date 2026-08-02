import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { Field, ModelDecorator, ForeignKey, OneToMany, OneToOne } from './decorators/index.js';
import { clearRegistry, getModel } from './registry.js';
import { Model } from './types.js';
import type { Id } from './types.js';

describe('decorators', () => {
  beforeEach(() => {
    clearRegistry();
  });

  describe('@Field', () => {
    it('registers field metadata on the prototype', () => {
      class TestClass {
        @Field({ type: 'string', maxLength: 100 })
        name!: string;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields).toBeDefined();
      expect(fields.has('name')).toBe(true);
      expect(fields.get('name').type).toBe('string');
      expect(fields.get('name').maxLength).toBe(100);
      expect(fields.get('name').propertyKey).toBe('name');
    });

    it('registers multiple fields', () => {
      class TestClass {
        @Field({ type: 'string' })
        name!: string;

        @Field({ type: 'integer' })
        age!: number;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.size).toBe(2);
      expect(fields.has('name')).toBe(true);
      expect(fields.has('age')).toBe(true);
    });

    it('uses dbColumn override when provided', () => {
      class TestClass {
        @Field({ type: 'datetime', dbColumn: 'created_at' })
        createdAt!: Date;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.get('createdAt').name).toBe('created_at');
      expect(fields.get('createdAt').dbColumn).toBe('created_at');
    });

    it('defaults name to propertyKey when no dbColumn', () => {
      class TestClass {
        @Field({ type: 'string' })
        username!: string;
      }

      const fields: Map<string, any> = Reflect.getOwnMetadata('reacto:fields', TestClass.prototype);
      expect(fields.get('username').name).toBe('username');
    });
  });

  describe('@Model', () => {
    it('registers the model in the global registry', () => {
      @ModelDecorator({ tableName: 'test_items' })
      class TestItem extends Model {
        @Field({ type: 'string' })
        name!: string;
      }

      expect(getModel('TestItem')).toBeDefined();
    });

    it('sets tableName on the class', () => {
      @ModelDecorator({ tableName: 'products' })
      class Product extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      expect((Product as any).tableName).toBe('products');
    });

    it('sets _modelName on the class', () => {
      @ModelDecorator({ tableName: 'items' })
      class Item extends Model {
        @Field({ type: 'string' })
        label!: string;
      }

      expect((Item as any)._modelName).toBe('Item');
    });

    it('sets meta with default ordering', () => {
      @ModelDecorator({ tableName: 'things' })
      class Thing extends Model {
        @Field({ type: 'string' })
        name!: string;
      }

      const meta = (Thing as any).meta;
      expect(meta.tableName).toBe('things');
      expect(meta.ordering).toEqual(['-createdAt']);
      expect(meta.verboseName).toBe('thing');
      expect(meta.verboseNamePlural).toBe('things');
    });

    it('allows custom ordering and verbose names', () => {
      @ModelDecorator({
        tableName: 'events',
        ordering: ['createdAt'],
        verboseName: 'event',
        verboseNamePlural: 'events',
      })
      class Event extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      const meta = (Event as any).meta;
      expect(meta.ordering).toEqual(['createdAt']);
      expect(meta.verboseName).toBe('event');
      expect(meta.verboseNamePlural).toBe('events');
    });

    it('collects fields including built-ins', () => {
      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      const fields = (Post as any).fields;
      expect(fields.has('id')).toBe(true);
      expect(fields.has('createdAt')).toBe(true);
      expect(fields.has('updatedAt')).toBe(true);
      expect(fields.has('title')).toBe(true);
    });

    it('auto-derives tableName from class name when not provided', () => {
      @ModelDecorator()
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      expect((Post as any).tableName).toBe('posts');
      expect((Post as any).meta.tableName).toBe('posts');
    });

    it('auto-derives tableName for multi-word class names', () => {
      @ModelDecorator()
      class BlogPost extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      expect((BlogPost as any).tableName).toBe('blog_posts');
    });

    it('auto-derives tableName with proper pluralization', () => {
      @ModelDecorator()
      class Category extends Model {
        @Field({ type: 'string' })
        name!: string;
      }

      expect((Category as any).tableName).toBe('categories');
    });
  });

  describe('@ForeignKey', () => {
    it('creates a foreign key column with default naming', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User)
        author!: Id<User>;
      }

      const fields = (Post as any).fields;
      expect(fields.has('author')).toBe(true);
      expect(fields.get('author').type).toBe('integer');
      expect(fields.get('author').dbColumn).toBe('author_id');
      expect(fields.get('author').index).toBe(true);
    });

    it('creates a foreign key column with custom dbColumn', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User, { dbColumn: 'created_by' })
        createdBy!: Id<User>;
      }

      const fields = (Post as any).fields;
      expect(fields.get('createdBy').dbColumn).toBe('created_by');
    });

    it('registers the relation metadata', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User)
        author!: Id<User>;
      }

      const relations = (Post as any).relations;
      expect(relations.has('author')).toBe(true);
      expect(relations.get('author').type).toBe('foreignKey');
      expect(relations.get('author').foreignKeyColumn).toBe('author_id');
    });

    it('auto-creates an index for the FK column', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User)
        author!: Id<User>;
      }

      const meta = (Post as any).meta;
      expect(meta.indexes).toBeDefined();
      expect(meta.indexes.some((i: any) => i.fields.includes('author_id'))).toBe(true);
    });

    it('stores onDelete and onUpdate options', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User, { onDelete: 'SET NULL', onUpdate: 'CASCADE' })
        author!: Id<User>;
      }

      const relations = (Post as any).relations;
      expect(relations.get('author').onDelete).toBe('SET NULL');
      expect(relations.get('author').onUpdate).toBe('CASCADE');
    });
  });

  describe('@OneToMany', () => {
    it('registers a one-to-many relation (no column)', () => {
      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @OneToMany(() => Post, { mappedBy: 'author' })
        posts!: Post[];
      }

      const relations = (User as any).relations;
      expect(relations.has('posts')).toBe(true);
      expect(relations.get('posts').type).toBe('oneToMany');
      expect(relations.get('posts').mappedBy).toBe('author');
    });

    it('does NOT create a database column', () => {
      @ModelDecorator({ tableName: 'comments' })
      class Comment extends Model {
        @Field({ type: 'text' })
        body!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @OneToMany(() => Comment, { mappedBy: 'post' })
        comments!: Comment[];
      }

      const fields = (Post as any).fields;
      // 'comments' should NOT be a field (it's a relation-only)
      expect(fields.has('comments')).toBe(false);
    });
  });

  describe('@OneToOne', () => {
    it('registers a one-to-one relation', () => {
      @ModelDecorator({ tableName: 'profiles' })
      class Profile extends Model {
        @Field({ type: 'string' })
        bio!: string;
      }

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @OneToOne(() => Profile, { mappedBy: 'user' })
        profile!: Profile;
      }

      const relations = (User as any).relations;
      expect(relations.has('profile')).toBe(true);
      expect(relations.get('profile').type).toBe('oneToOne');
    });
  });

  describe('Id<T> type', () => {
    it('compiles as number (the PK type)', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      const id: Id<User> = 42;
      expect(typeof id).toBe('number');
    });
  });

  describe('toJSON() with relations', () => {
    it('includes loaded relations in toJSON output', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User)
        author!: Id<User>;
      }

      const user = new User() as any;
      user.id = 1;
      user.username = 'john';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const post = new Post() as any;
      post.id = 1;
      post.title = 'Hello';
      post.author = user;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();
      expect(json.title).toBe('Hello');
      expect(json.author).toBeDefined();
      expect((json.author as any).username).toBe('john');
    });

    it('does not include unloaded relations', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User)
        author!: Id<User>;
      }

      const post = new Post() as any;
      post.id = 1;
      post.title = 'Hello';
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();
      expect(json.title).toBe('Hello');
      // author is undefined (not loaded), so it's included as undefined
      expect(json.author).toBeUndefined();
    });
  });
});
