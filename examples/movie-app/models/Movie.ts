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

  @Field({ type: 'float', default: 0 })
  averageRating!: number;

  @Field({ type: 'integer', default: 0 })
  reviewCount!: number;

  @OneToMany(() => Review, 'movie')
  reviews!: Review[];

  @Signal('postSave')
  async recalcRating() {
    const reviews = await ModelManager.objects(Review).filter({ movieId: this.id }).all();
    if (reviews.length > 0) {
      const sum = reviews.reduce((a, r) => a + (r.rating as number), 0);
      this.averageRating = Math.round((sum / reviews.length) * 10) / 10;
      this.reviewCount = reviews.length;
    }
  }
}

// Need this import for the signal
import { ModelManager } from '@reacto-org/core';
