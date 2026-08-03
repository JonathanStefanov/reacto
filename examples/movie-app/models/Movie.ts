/**
 * Movie model
 */
import { Field, Model, OneToMany, Signal } from '@reacto-org/core';
import { Review } from './Review.js';

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
