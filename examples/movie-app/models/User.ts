/**
 * User model
 */
import { Field, Model, OneToMany, Signal } from '@reacto-org/core';
import { Review } from './Review.js';
import { ChatMessage } from './ChatMessage.js';

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

  toJSON() {
    const { password, ...rest } = this as Record<string, unknown>;
    return rest;
  }
}
