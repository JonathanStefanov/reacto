import { describe, it, expect, beforeEach } from 'vitest';
import 'reflect-metadata';
import { Field, ModelDecorator, ForeignKey, OneToMany, OneToOne } from './decorators/index.js';
import { clearRegistry, getModel } from './registry.js';
import { Model } from './types.js';

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

    it('requires tableName in options', () => {
      // tableName is required - without it, table name would be undefined
      @ModelDecorator({ tableName: 'valid' })
      class Valid extends Model {
        @Field({ type: 'string' })
        name!: string;
      }
      expect((Valid as any).tableName).toBe('valid');
    });
  });

  describe('@ForeignKey', () => {
    it('creates a foreign key column with Id suffix', () => {
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
        author!: number;
      }

      const fields = (Post as any).fields;
      // FK decorator creates field with 'Id' suffix: author → authorId
      expect(fields.has('authorId')).toBe(true);
      expect(fields.get('authorId').type).toBe('integer');
      expect(fields.get('authorId').index).toBe(true);
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
        author!: number;
      }

      const relations = (Post as any).relations;
      expect(relations.has('author')).toBe(true);
      expect(relations.get('author').type).toBe('foreignKey');
      expect(relations.get('author').foreignKey).toBe('authorId');
    });

    it('stores onDelete option', () => {
      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;
      }

      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;

        @ForeignKey(() => User, { onDelete: 'SET NULL' })
        author!: number;
      }

      const relations = (Post as any).relations;
      expect(relations.get('author').onDelete).toBe('SET NULL');
    });
  });

  describe('@OneToMany', () => {
    it('registers a one-to-many relation', () => {
      @ModelDecorator({ tableName: 'posts' })
      class Post extends Model {
        @Field({ type: 'string' })
        title!: string;
      }

      @ModelDecorator({ tableName: 'users' })
      class User extends Model {
        @Field({ type: 'string' })
        username!: string;

        @OneToMany(() => Post, 'authorId')
        posts!: Post[];
      }

      const relations = (User as any).relations;
      expect(relations.has('posts')).toBe(true);
      expect(relations.get('posts').type).toBe('oneToMany');
      expect(relations.get('posts').inverseSide).toBe('authorId');
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

        @OneToMany(() => Comment, 'postId')
        comments!: Comment[];
      }

      const fields = (Post as any).fields;
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

        @OneToOne(() => Profile)
        profileId!: number;
      }

      const relations = (User as any).relations;
      expect(relations.has('profileId')).toBe(true);
      expect(relations.get('profileId').type).toBe('oneToOne');
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
        author!: number;
      }

      const user = new User() as any;
      user.id = 1;
      user.username = 'john';
      user.createdAt = new Date();
      user.updatedAt = new Date();

      const post = new Post() as any;
      post.id = 1;
      post.title = 'Hello';
      post.author = user; // loaded relation
      post.authorId = user.id;
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
        author!: number;
      }

      const post = new Post() as any;
      post.id = 1;
      post.title = 'Hello';
      post.authorId = 1;
      post.createdAt = new Date();
      post.updatedAt = new Date();

      const json = post.toJSON();
      expect(json.title).toBe('Hello');
      // author is not loaded, so it's undefined
      expect(json.author).toBeUndefined();
    });
  });
});
