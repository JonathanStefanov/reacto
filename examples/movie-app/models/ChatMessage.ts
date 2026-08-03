/**
 * ChatMessage model
 */
import { Field, Model, ForeignKey, Signal, Validators } from '@reacto-org/core';
import { User } from './User.js';

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
    const min = Validators.minLength(this.content, 'content', 1);
    if (min) throw new Error(min);
    const max = Validators.maxLength(this.content, 'content', 2000);
    if (max) throw new Error(max);
  }
}
