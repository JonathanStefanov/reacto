/**
 * Tasks — auto-discovered and registered
 */
import { task, ModelManager } from '@reacto-org/ssr';
import { User } from '../models/index.js';

export const sendWelcomeEmail = task('sendWelcomeEmail', async (userId: number) => {
  const user = await ModelManager.objects(User).get({ id: userId });
  console.log(`📧 Welcome email sent to ${user.email}`);
  return { sent: true };
}, { queue: 'emails', retries: 3 });
