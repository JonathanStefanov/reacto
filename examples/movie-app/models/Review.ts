/**
 * Review model
 */
import { Field, Model, ForeignKey, Signal } from '@reacto-org/core';
import { Movie } from './Movie.js';
import { User } from './User.js';

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
