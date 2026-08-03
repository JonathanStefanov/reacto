/**
 * Models — Database model definitions
 *
 * Like Django's models.py. Each model maps to a database table.
 *
 * Import from here in views, routes, tasks, etc.:
 *   import { User, Movie, Review } from '../models/index.js';
 */
import { User } from './User.js';
import { Movie } from './Movie.js';
import { Review } from './Review.js';
import { ChatMessage } from './ChatMessage.js';

export { User, Movie, Review, ChatMessage };

// All models — used for migrations, admin, etc.
export const allModels = [User, Movie, Review, ChatMessage];
