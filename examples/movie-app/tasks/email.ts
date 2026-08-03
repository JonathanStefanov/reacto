/**
 * Tasks — Background jobs
 *
 * Like Django's tasks.py (with celery). Runs async, not blocking the request.
 */
import { ModelManager, createTask } from '@reacto-org/core';
import { User } from '../models/index.js';

/**
 * Send welcome email to new users.
 * Runs in background queue, retries on failure.
 */
export const sendWelcomeEmail = createTask(
  'sendWelcomeEmail',
  async (userId: number) => {
    const user = await ModelManager.objects(User).get({ id: userId });
    console.log(`📧 Sending welcome email to ${user.email}...`);
    // Simulate email sending
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`✅ Welcome email sent to ${user.email}`);
    return { sent: true, email: user.email };
  },
  { queue: 'emails', retries: 3 }
);
