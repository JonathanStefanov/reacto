import { Field, Model, ForeignKey, OneToMany, Signal, Validators } from '@reacto-org/core';

// ─── User Model ──────────────────────────────────────────────────────────────

@Model({ tableName: 'users' })
export class User {
  @Field({ type: 'string', maxLength: 100 })
  username!: string;

  @Field({ type: 'email', unique: true })
  email!: string;

  @Field({ type: 'string', maxLength: 255 })
  password!: string;

  @Field({ type: 'string', maxLength: 500, nullable: true })
  bio?: string;

  @Field({ type: 'string', nullable: true })
  avatarUrl?: string;

  @Field({ type: 'boolean', default: true })
  isActive!: boolean;

  @OneToMany(() => Review, 'user')
  reviews!: Review[];

  @OneToMany(() => ChatMessage, 'user')
  messages!: ChatMessage[];

  @Signal('preSave')
  async hashPassword() {
    if (this.password && !this.password.startsWith('$2')) {
      const bcrypt = await import('bcryptjs');
      this.password = await bcrypt.hash(this.password, 10);
    }
  }

  @Signal('preSave')
  validateEmail() {
    const result = Validators.email(this.email, 'email');
    if (result) throw new Error(result);
  }

  toJSON() {
    const { password, ...rest } = this as Record<string, unknown>;
    return rest;
  }
}

// ─── Movie Model ─────────────────────────────────────────────────────────────

@Model({ tableName: 'movies' })
export class Movie {
  @Field({ type: 'string', maxLength: 255 })
  title!: string;

  @Field({ type: 'text' })
  description!: string;

  @Field({ type: 'string', maxLength: 100 })
  director!: string;

  @Field({ type: 'integer' })
  year!: number;

  @Field({ type: 'string', maxLength: 100, nullable: true })
  genre?: string;

  @Field({ type: 'string', nullable: true })
  posterUrl?: string;

  @Field({ type: 'float', default: 0 })
  averageRating!: number;

  @Field({ type: 'integer', default: 0 })
  reviewCount!: number;

  @OneToMany(() => Review, 'movie')
  reviews!: Review[];

  @Signal('postSave')
  async updateAverageRating() {
    // Recalculate average rating after a review is saved
    const { ModelManager } = await import('@reacto-org/core');
    const reviews = await ModelManager.objects(Review)
      .filter({ movieId: this.id })
      .all();

    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (r.rating as number), 0);
      this.averageRating = Math.round((sum / reviews.length) * 10) / 10;
      this.reviewCount = reviews.length;
    }
  }
}

// ─── Review Model ────────────────────────────────────────────────────────────

@Model({ tableName: 'reviews' })
export class Review {
  @ForeignKey(() => Movie, { onDelete: 'CASCADE' })
  movieId!: number;

  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  userId!: number;

  @Field({ type: 'integer' })
  rating!: number;

  @Field({ type: 'text', nullable: true })
  comment?: string;

  @Field({ type: 'datetime', default: 'now' })
  watchedAt!: Date;

  movie?: Movie;
  user?: User;

  @Signal('preSave')
  validateRating() {
    if (this.rating < 1 || this.rating > 10) {
      throw new Error('Rating must be between 1 and 10');
    }
  }
}

// ─── Chat Message Model ──────────────────────────────────────────────────────

@Model({ tableName: 'chat_messages' })
export class ChatMessage {
  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  userId!: number;

  @Field({ type: 'text' })
  content!: string;

  @Field({ type: 'string', maxLength: 50, default: 'general' })
  channel!: string;

  user?: User;

  @Signal('preSave')
  validateContent() {
    const result = Validators.minLength(this.content, 'content', 1);
    if (result) throw new Error(result);
    const maxResult = Validators.maxLength(this.content, 'content', 2000);
    if (maxResult) throw new Error(maxResult);
  }
}
