/**
 * Tests for Reacto Background Tasks
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  MemoryTaskQueue,
  getTaskQueue,
  configureTaskQueue,
  resetTaskQueue,
  createTask,
} from './index.js';
import type { TaskJob, TaskStatus } from './index.js';

// ─── MemoryTaskQueue ─────────────────────────────────────────────────────────

describe('MemoryTaskQueue', () => {
  let queue: MemoryTaskQueue;

  beforeEach(async () => {
    queue = new MemoryTaskQueue({ concurrency: 2, pollInterval: 50 });
    await queue.start();
  });

  afterEach(async () => {
    await queue.stop();
  });

  it('registers and executes a task', async () => {
    const handler = vi.fn(async () => 'result');
    queue.registerHandler('test-task', handler);

    const job = await queue.enqueue('test-task', [1, 2, 3]);

    expect(job.name).toBe('test-task');
    expect(job.args).toEqual([1, 2, 3]);
    expect(job.id).toBeDefined();

    // Wait for execution
    await new Promise((r) => setTimeout(r, 200));

    const updated = await queue.getJobStatus(job.id);
    expect(updated!.status).toBe('completed');
    expect(updated!.result).toBe('result');
    expect(handler).toHaveBeenCalledWith(1, 2, 3);
  });

  it('throws when enqueueing unregistered task', async () => {
    await expect(queue.enqueue('unknown', [])).rejects.toThrow(
      "No handler registered for task 'unknown'"
    );
  });

  it('tracks task attempts', async () => {
    let callCount = 0;
    queue.registerHandler('retry-task', async () => {
      callCount++;
      if (callCount < 3) throw new Error('fail');
      return 'success';
    }, { retries: 3, retryDelay: 50 });

    const job = await queue.enqueue('retry-task', []);
    await new Promise((r) => setTimeout(r, 500));

    const updated = await queue.getJobStatus(job.id);
    expect(updated!.status).toBe('completed');
    expect(updated!.attempts).toBe(3);
  });

  it('fails after max retries', async () => {
    queue.registerHandler('fail-task', async () => {
      throw new Error('always fails');
    }, { retries: 2, retryDelay: 50 });

    const job = await queue.enqueue('fail-task', []);
    await new Promise((r) => setTimeout(r, 500));

    const updated = await queue.getJobStatus(job.id);
    expect(updated!.status).toBe('failed');
    expect(updated!.error).toBe('always fails');
    expect(updated!.attempts).toBe(2);
  });

  it('respects timeout', async () => {
    queue.registerHandler('slow-task', async () => {
      await new Promise((r) => setTimeout(r, 5000));
      return 'done';
    }, { timeout: 100, retries: 1, retryDelay: 50 });

    const job = await queue.enqueue('slow-task', []);
    await new Promise((r) => setTimeout(r, 500));

    const updated = await queue.getJobStatus(job.id);
    expect(updated!.status).toBe('failed');
    expect(updated!.error).toContain('timed out');
  });

  it('supports delayed execution', async () => {
    const handler = vi.fn(async () => 'delayed');
    queue.registerHandler('delayed-task', handler);

    const job = await queue.enqueue('delayed-task', [], { delay: 0.5 });

    expect(job.status).toBe('delayed');
    expect(job.scheduledFor).toBeDefined();

    // Should not have executed yet
    await new Promise((r) => setTimeout(r, 100));
    expect(handler).not.toHaveBeenCalled();

    // Wait for delay to pass
    await new Promise((r) => setTimeout(r, 1500));
    expect(handler).toHaveBeenCalled();
  });

  it('cancels jobs', async () => {
    queue.registerHandler('cancel-task', async () => {
      await new Promise((r) => setTimeout(r, 5000));
    });

    const job = await queue.enqueue('cancel-task', []);
    const cancelled = await queue.cancelJob(job.id);

    expect(cancelled).toBe(true);
    const updated = await queue.getJobStatus(job.id);
    expect(updated!.status).toBe('cancelled');
  });

  it('cannot cancel completed jobs', async () => {
    queue.registerHandler('done-task', async () => 'done');
    const job = await queue.enqueue('done-task', []);
    await new Promise((r) => setTimeout(r, 100));

    const cancelled = await queue.cancelJob(job.id);
    expect(cancelled).toBe(false);
  });

  it('returns null for unknown job', async () => {
    const job = await queue.getJobStatus('nonexistent');
    expect(job).toBeNull();
  });

  it('filters jobs by status', async () => {
    queue.registerHandler('task-a', async () => 'a');
    queue.registerHandler('task-b', async () => { throw new Error('fail'); }, { retries: 1, retryDelay: 10 });

    await queue.enqueue('task-a', []);
    await queue.enqueue('task-b', []);
    await new Promise((r) => setTimeout(r, 200));

    const completed = await queue.getJobs('completed');
    expect(completed.length).toBeGreaterThanOrEqual(1);

    const failed = await queue.getJobs('failed');
    expect(failed.length).toBeGreaterThanOrEqual(1);
  });

  it('filters jobs by queue', async () => {
    queue.registerHandler('email-task', async () => 'email', { queue: 'emails' });
    queue.registerHandler('default-task', async () => 'default');

    await queue.enqueue('email-task', [], { queue: 'emails' });
    await queue.enqueue('default-task', []);
    await new Promise((r) => setTimeout(r, 100));

    const emailJobs = await queue.getJobs(undefined, 'emails');
    expect(emailJobs.length).toBe(1);
    expect(emailJobs[0].queue).toBe('emails');
  });

  it('returns stats', async () => {
    queue.registerHandler('stat-task', async () => 'done');
    await queue.enqueue('stat-task', []);
    await new Promise((r) => setTimeout(r, 100));

    const stats = await queue.stats();
    expect(stats.total).toBeGreaterThanOrEqual(1);
    expect(stats.completed).toBeGreaterThanOrEqual(1);
  });

  it('measures task duration', async () => {
    queue.registerHandler('duration-task', async () => {
      await new Promise((r) => setTimeout(r, 50));
      return 'done';
    });

    const job = await queue.enqueue('duration-task', []);
    await new Promise((r) => setTimeout(r, 200));

    const updated = await queue.getJobStatus(job.id);
    expect(updated!.duration).toBeGreaterThan(0);
    expect(updated!.startedAt).toBeDefined();
    expect(updated!.completedAt).toBeDefined();
  });

  it('uses default queue name', async () => {
    queue.registerHandler('default-q', async () => 'ok');
    const job = await queue.enqueue('default-q', []);
    expect(job.queue).toBe('default');
  });

  it('uses custom queue name from handler options', async () => {
    queue.registerHandler('custom-q', async () => 'ok', { queue: 'my-queue' });
    const job = await queue.enqueue('custom-q', []);
    expect(job.queue).toBe('my-queue');
  });
});

// ─── createTask ──────────────────────────────────────────────────────────────

describe('createTask', () => {
  afterEach(() => {
    resetTaskQueue();
  });

  it('creates a callable task function', async () => {
    const sendEmail = createTask('sendEmail', async (to: string) => {
      return `sent to ${to}`;
    });

    const job = await sendEmail('test@example.com');
    expect(job.name).toBe('sendEmail');
    expect(job.args).toEqual(['test@example.com']);

    // Wait for execution
    await new Promise((r) => setTimeout(r, 300));
    const updated = await getTaskQueue().getJobStatus(job.id);
    expect(updated!.status).toBe('completed');
    expect(updated!.result).toBe('sent to test@example.com');
  });

  it('supports .delay() method', async () => {
    // Use a custom queue with faster polling for tests
    const testQueue = new MemoryTaskQueue({ pollInterval: 100 });
    configureTaskQueue({ backend: testQueue });
    await testQueue.start();

    const handler = vi.fn(async () => 'delayed');
    const delayedTask = createTask('delayed-test', handler);

    const job = await delayedTask.delay(0.3, 'arg1');
    expect(job.status).toBe('delayed');

    // Wait for delay + poll
    await new Promise((r) => setTimeout(r, 2000));
    expect(handler).toHaveBeenCalledWith('arg1');

    await testQueue.stop();
  });

  it('passes task options', async () => {
    const failTask = createTask('failTask', async () => {
      throw new Error('oops');
    }, { retries: 1, retryDelay: 50, queue: 'critical' });

    const job = await failTask();
    expect(job.queue).toBe('critical');
  });
});

// ─── Singleton Functions ─────────────────────────────────────────────────────

describe('getTaskQueue / configureTaskQueue / resetTaskQueue', () => {
  afterEach(() => {
    resetTaskQueue();
  });

  it('getTaskQueue returns a TaskQueueBackend', () => {
    const queue = getTaskQueue();
    expect(queue).toBeDefined();
    expect(typeof queue.enqueue).toBe('function');
    expect(typeof queue.getJobStatus).toBe('function');
  });

  it('getTaskQueue returns same instance', () => {
    const a = getTaskQueue();
    const b = getTaskQueue();
    expect(a).toBe(b);
  });

  it('configureTaskQueue creates new instance', () => {
    const a = getTaskQueue();
    resetTaskQueue();
    const b = configureTaskQueue({ memory: { concurrency: 10 } });
    expect(a).not.toBe(b);
    expect(getTaskQueue()).toBe(b);
  });

  it('configureTaskQueue accepts custom backend', async () => {
    const custom = new MemoryTaskQueue();
    configureTaskQueue({ backend: custom });
    expect(getTaskQueue()).toBe(custom);
  });

  it('resetTaskQueue clears singleton', () => {
    const a = getTaskQueue();
    resetTaskQueue();
    const b = getTaskQueue();
    expect(a).not.toBe(b);
  });
});

// ─── Concurrency ─────────────────────────────────────────────────────────────

describe('Concurrency', () => {
  it('respects concurrency limit', async () => {
    const queue = new MemoryTaskQueue({ concurrency: 2, pollInterval: 50 });
    let running = 0;
    let maxRunning = 0;

    queue.registerHandler('concurrent-task', async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      await new Promise((r) => setTimeout(r, 100));
      running--;
      return 'done';
    });

    await queue.start();

    // Enqueue 5 tasks
    const jobs = [];
    for (let i = 0; i < 5; i++) {
      jobs.push(await queue.enqueue('concurrent-task', [i]));
    }

    // Wait for all to complete
    await new Promise((r) => setTimeout(r, 1000));

    expect(maxRunning).toBeLessThanOrEqual(2);

    for (const job of jobs) {
      const updated = await queue.getJobStatus(job.id);
      expect(updated!.status).toBe('completed');
    }

    await queue.stop();
  });
});

// ─── Multiple Queues ─────────────────────────────────────────────────────────

describe('Multiple queues', () => {
  it('processes tasks from different queues independently', async () => {
    const queue = new MemoryTaskQueue({ concurrency: 5, pollInterval: 50 });

    const results: string[] = [];

    queue.registerHandler('email-job', async (to: string) => {
      results.push(`email:${to}`);
      return `emailed ${to}`;
    }, { queue: 'emails' });

    queue.registerHandler('image-job', async (url: string) => {
      results.push(`image:${url}`);
      return `processed ${url}`;
    }, { queue: 'images' });

    await queue.start();

    await queue.enqueue('email-job', ['test@test.com'], { queue: 'emails' });
    await queue.enqueue('image-job', ['photo.jpg'], { queue: 'images' });

    await new Promise((r) => setTimeout(r, 200));

    expect(results).toContain('email:test@test.com');
    expect(results).toContain('image:photo.jpg');

    await queue.stop();
  });
});
