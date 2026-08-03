/**
 * Tasks — Background jobs
 */
import { ModelManager, createTask } from '@reacto-org/core';
import { User } from '../models/index.js';

export const sendWelcomeEmail = createTask(
  'sendWelcomeEmail',
  async (userId: number) => {
    const user = await ModelManager.objects(User).get({ id: userId });
    console.log(`📧 Sending welcome email to ${user.email}...`);
    await new Promise((r) => setTimeout(r, 1000));
    console.log(`✅ Welcome email sent to ${user.email}`);
    return { sent: true, email: user.email };
  },
  { queue: 'emails', retries: 3 }
);
