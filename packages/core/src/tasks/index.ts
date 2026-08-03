/**
 * Reacto — Background Tasks
 *
 * Provides a Django-like @task decorator for background job processing.
 *
 * Features:
 *   - @task decorator for async functions
 *   - In-memory queue for development
 *   - Redis/BullMQ backend for production
 *   - Retry logic with exponential backoff
 *   - Task status tracking (pending, running, completed, failed)
 *   - Delayed/scheduled execution
 *   - Task monitoring API
 *
 * @example
 *   import { task, getTaskQueue } from '@reacto-org/core';
 *
 *   @task({ queue: 'emails', retries: 3 })
 *   async function sendWelcomeEmail(userId: number) {
 *     const user = await User.objects.get({ id: userId });
 *     await emailService.send(user.email, 'Welcome!');
 *   }
 *
 *   // Execute immediately
 *   await sendWelcomeEmail(42);
 *
 *   // Execute with delay
 *   await sendWelcomeEmail.delay(60, 42); // 60 second delay
 *
 *   // Check status
 *   const status = await getTaskQueue().getJobStatus(jobId);
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'delayed';

export interface TaskOptions {
  /** Queue name (default: 'default') */
  queue?: string;
  /** Max retry attempts (default: 3) */
  retries?: number;
  /** Retry delay in ms (default: 1000, uses exponential backoff) */
  retryDelay?: number;
  /** Task timeout in ms (default: 30000) */
  timeout?: number;
  /** Task name (defaults to function name) */
  name?: string;
}

export interface TaskJob {
  id: string;
  name: string;
  queue: string;
  status: TaskStatus;
  args: unknown[];
  result?: unknown;
  error?: string;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  scheduledFor?: Date;
  duration?: number;
}

export interface TaskQueueOptions {
  /** Concurrency per queue (default: 5) */
  concurrency?: number;
  /** Poll interval in ms for delayed jobs (default: 1000) */
  pollInterval?: number;
}

// ─── Task Queue Interface ────────────────────────────────────────────────────

export interface TaskQueueBackend {
  enqueue(name: string, args: unknown[], options?: { delay?: number; queue?: string }): Promise<TaskJob>;
  getJobStatus(jobId: string): Promise<TaskJob | null>;
  getJobs(status?: TaskStatus, queue?: string): Promise<TaskJob[]>;
  cancelJob(jobId: string): Promise<boolean>;
  registerHandler(name: string, handler: (...args: unknown[]) => Promise<unknown>, options?: TaskOptions): void;
  start(): Promise<void>;
  stop(): Promise<void>;
  stats(): Promise<{ pending: number; running: number; completed: number; failed: number; total: number }>;
}

// ─── In-Memory Task Queue ─────────────────────────────────────────────────────

export class MemoryTaskQueue implements TaskQueueBackend {
  private jobs = new Map<string, TaskJob>();
  private handlers = new Map<string, { handler: (...args: unknown[]) => Promise<unknown>; options: TaskOptions }>();
  private running = new Set<string>();
  private idCounter = 0;
  private concurrency: number;
  private pollInterval: number;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private processing = false;

  constructor(options: TaskQueueOptions = {}) {
    this.concurrency = options.concurrency ?? 5;
    this.pollInterval = options.pollInterval ?? 1000;
  }

  async enqueue(
    name: string,
    args: unknown[],
    options?: { delay?: number; queue?: string }
  ): Promise<TaskJob> {
    const id = `task_${Date.now()}_${++this.idCounter}`;
    const handlerEntry = this.handlers.get(name);
    if (!handlerEntry) {
      throw new Error(`No handler registered for task '${name}'`);
    }

    const job: TaskJob = {
      id,
      name,
      queue: options?.queue ?? handlerEntry.options.queue ?? 'default',
      status: options?.delay ? 'delayed' : 'pending',
      args,
      attempts: 0,
      maxAttempts: handlerEntry.options.retries ?? 3,
      createdAt: new Date(),
      scheduledFor: options?.delay ? new Date(Date.now() + options.delay * 1000) : undefined,
    };

    this.jobs.set(id, job);

    // Process immediately if no delay
    if (!options?.delay) {
      this.processNext();
    }

    return job;
  }

  async getJobStatus(jobId: string): Promise<TaskJob | null> {
    return this.jobs.get(jobId) ?? null;
  }

  async getJobs(status?: TaskStatus, queue?: string): Promise<TaskJob[]> {
    return Array.from(this.jobs.values()).filter((job) => {
      if (status && job.status !== status) return false;
      if (queue && job.queue !== queue) return false;
      return true;
    });
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (job.status === 'completed' || job.status === 'failed') return false;

    job.status = 'cancelled';
    this.running.delete(jobId);
    return true;
  }

  registerHandler(
    name: string,
    handler: (...args: unknown[]) => Promise<unknown>,
    options: TaskOptions = {}
  ): void {
    this.handlers.set(name, { handler, options });
  }

  async start(): Promise<void> {
    if (this.pollTimer) return;

    this.pollTimer = setInterval(() => {
      this.processDelayedJobs();
    }, this.pollInterval);

    if (this.pollTimer.unref) {
      this.pollTimer.unref();
    }

    this.processing = true;
  }

  async stop(): Promise<void> {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    this.processing = false;
  }

  async stats(): Promise<{ pending: number; running: number; completed: number; failed: number; total: number }> {
    const jobs = Array.from(this.jobs.values());
    return {
      pending: jobs.filter((j) => j.status === 'pending').length,
      running: jobs.filter((j) => j.status === 'running').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      total: jobs.length,
    };
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private processDelayedJobs(): void {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.status === 'delayed' && job.scheduledFor && job.scheduledFor.getTime() <= now) {
        job.status = 'pending';
        job.scheduledFor = undefined;
      }
    }
    this.processNext();
  }

  private processNext(): void {
    if (!this.processing) return;
    if (this.running.size >= this.concurrency) return;

    // Find next pending job
    const pendingJobs = Array.from(this.jobs.values())
      .filter((j) => j.status === 'pending')
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

    if (pendingJobs.length === 0) return;

    const job = pendingJobs[0];
    this.executeJob(job);
  }

  private async executeJob(job: TaskJob): Promise<void> {
    const handlerEntry = this.handlers.get(job.name);
    if (!handlerEntry) return;

    job.status = 'running';
    job.startedAt = new Date();
    job.attempts++;
    this.running.add(job.id);

    const timeout = handlerEntry.options.timeout ?? 30000;

    try {
      const result = await Promise.race([
        handlerEntry.handler(...job.args),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Task '${job.name}' timed out after ${timeout}ms`)), timeout)
        ),
      ]);

      job.status = 'completed';
      job.result = result;
      job.completedAt = new Date();
      job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      if (job.attempts < job.maxAttempts) {
        // Retry with exponential backoff
        const backoff = (handlerEntry.options.retryDelay ?? 1000) * Math.pow(2, job.attempts - 1);
        job.status = 'delayed';
        job.scheduledFor = new Date(Date.now() + backoff);
      } else {
        job.status = 'failed';
        job.error = err.message;
        job.completedAt = new Date();
        job.duration = job.completedAt.getTime() - job.startedAt!.getTime();
      }
    } finally {
      this.running.delete(job.id);
      // Process next in queue
      setTimeout(() => this.processNext(), 0);
    }
  }
}

// ─── Redis/BullMQ Task Queue ─────────────────────────────────────────────────

export interface RedisTaskQueueOptions {
  client: unknown; // ioredis instance
  prefix?: string;
  concurrency?: number;
}

/**
 * BullMQ-backed task queue for production use.
 * Requires `bullmq` and `ioredis` packages.
 */
export class RedisTaskQueue implements TaskQueueBackend {
  private prefix: string;
  private concurrency: number;
  private client: unknown;
  private handlers = new Map<string, { handler: (...args: unknown[]) => Promise<unknown>; options: TaskOptions }>();
  private queues = new Map<string, unknown>();
  private workers = new Map<string, unknown>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private bullmq: any = null;

  constructor(options: RedisTaskQueueOptions) {
    this.client = options.client;
    this.prefix = options.prefix ?? 'reacto:tasks:';
    this.concurrency = options.concurrency ?? 5;
  }

  private async getBullMQ(): Promise<any> {
    if (!this.bullmq) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        this.bullmq = require('bullmq');
      } catch {
        throw new Error('RedisTaskQueue requires bullmq package. Install with: npm install bullmq');
      }
    }
    return this.bullmq;
  }

  async enqueue(
    name: string,
    args: unknown[],
    options?: { delay?: number; queue?: string }
  ): Promise<TaskJob> {
    const queueName = options?.queue ?? 'default';
    const id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const handlerEntry = this.handlers.get(name);

    try {
      const BullMQ = await this.getBullMQ();
      const queue = this.getQueue(queueName, BullMQ);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const job = await (queue as any).add(name, { args, taskId: id }, {
        delay: options?.delay ? options.delay * 1000 : undefined,
        attempts: handlerEntry?.options.retries ?? 3,
        backoff: { type: 'exponential', delay: 1000 },
      });

      return {
        id: String(job.id ?? id),
        name,
        queue: queueName,
        status: options?.delay ? 'delayed' : 'pending',
        args,
        attempts: 0,
        maxAttempts: handlerEntry?.options.retries ?? 3,
        createdAt: new Date(),
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('bullmq')) throw error;
      throw new Error('RedisTaskQueue: Failed to enqueue task');
    }
  }

  async getJobStatus(jobId: string): Promise<TaskJob | null> {
    try {
      const BullMQ = await this.getBullMQ();
      for (const [, queue] of this.queues) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const job = await (queue as any).getJob(jobId);
        if (job) {
          const state = await job.getState();
          return {
            id: String(job.id),
            name: job.name,
            queue: job.queueName,
            status: this.mapBullStatus(state),
            args: job.data?.args ?? [],
            result: job.returnvalue,
            error: job.failedReason,
            attempts: job.attemptsMade,
            maxAttempts: job.opts?.attempts ?? 1,
            createdAt: new Date(job.timestamp),
            startedAt: job.processedOn ? new Date(job.processedOn) : undefined,
            completedAt: job.finishedOn ? new Date(job.finishedOn) : undefined,
          };
        }
      }
    } catch {
      // bullmq not available
    }
    return null;
  }

  async getJobs(_status?: TaskStatus, _queue?: string): Promise<TaskJob[]> {
    return [];
  }

  async cancelJob(jobId: string): Promise<boolean> {
    try {
      const BullMQ = await this.getBullMQ();
      for (const [, queue] of this.queues) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const job = await (queue as any).getJob(jobId);
        if (job) {
          await job.remove();
          return true;
        }
      }
    } catch {
      // bullmq not available
    }
    return false;
  }

  registerHandler(
    name: string,
    handler: (...args: unknown[]) => Promise<unknown>,
    options: TaskOptions = {}
  ): void {
    this.handlers.set(name, { handler, options });
  }

  async start(): Promise<void> {
    const BullMQ = await this.getBullMQ();
    const queueNames = new Set<string>();
    for (const [, opt] of this.handlers) {
      queueNames.add(opt.options.queue ?? 'default');
    }

    for (const queueName of queueNames) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const worker = new BullMQ.Worker(
        `${this.prefix}${queueName}`,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async (job: any) => {
          const handlerEntry = this.handlers.get(job.name);
          if (!handlerEntry) throw new Error(`No handler for task '${job.name}'`);
          return handlerEntry.handler(...(job.data?.args ?? []));
        },
        { connection: this.client, concurrency: this.concurrency }
      );

      worker.on('completed', (job: { name: string; id: string }) => {
        console.log(`[Reacto] Task ${job.name} (${job.id}) completed`);
      });

      worker.on('failed', (job: { name: string; id: string } | undefined, err: Error) => {
        console.error(`[Reacto] Task ${job?.name} (${job?.id}) failed:`, err.message);
      });

      this.workers.set(queueName, worker);
    }
  }

  async stop(): Promise<void> {
    for (const [, worker] of this.workers) {
      await (worker as { close: () => Promise<void> }).close();
    }
    this.workers.clear();
  }

  async stats(): Promise<{ pending: number; running: number; completed: number; failed: number; total: number }> {
    return { pending: 0, running: 0, completed: 0, failed: 0, total: 0 };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getQueue(name: string, BullMQ: any): unknown {
    if (!this.queues.has(name)) {
      const queue = new BullMQ.Queue(`${this.prefix}${name}`, {
        connection: this.client,
      });
      this.queues.set(name, queue);
    }
    return this.queues.get(name);
  }

  private mapBullStatus(state: string): TaskStatus {
    switch (state) {
      case 'waiting':
      case 'prioritized':
        return 'pending';
      case 'active':
        return 'running';
      case 'completed':
        return 'completed';
      case 'failed':
        return 'failed';
      case 'delayed':
        return 'delayed';
      default:
        return 'pending';
    }
  }
}

// ─── Singleton Queue ─────────────────────────────────────────────────────────

let defaultQueue: TaskQueueBackend | null = null;

/**
 * Get the default task queue instance.
 */
export function getTaskQueue(): TaskQueueBackend {
  if (!defaultQueue) {
    defaultQueue = new MemoryTaskQueue();
    defaultQueue.start().catch(() => {});
  }
  return defaultQueue;
}

/**
 * Configure the task queue with a specific backend.
 */
export function configureTaskQueue(options?: {
  backend?: TaskQueueBackend;
  memory?: TaskQueueOptions;
  redis?: RedisTaskQueueOptions;
}): TaskQueueBackend {
  if (options?.backend) {
    defaultQueue = options.backend;
  } else if (options?.redis) {
    defaultQueue = new RedisTaskQueue(options.redis);
  } else {
    defaultQueue = new MemoryTaskQueue(options?.memory);
  }
  return defaultQueue;
}

/**
 * Reset the task queue (for testing).
 */
export function resetTaskQueue(): void {
  if (defaultQueue) {
    defaultQueue.stop().catch(() => {});
  }
  defaultQueue = null;
}

// ─── @task Decorator ─────────────────────────────────────────────────────────

/**
 * @task — Register a function as a background task.
 *
 *   @task({ queue: 'emails', retries: 3 })
 *   async function sendEmail(to: string, subject: string) { ... }
 *
 *   // Call it — returns a TaskJob immediately
 *   const job = await sendEmail('user@example.com', 'Welcome!');
 *
 *   // Delayed execution
 *   const job = await sendEmail.delay(60, 'user@example.com', 'Welcome!');
 */
export function task(options: TaskOptions = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): void {
    const originalFn = descriptor.value as (...args: unknown[]) => Promise<unknown>;
    const taskName = options.name ?? propertyKey;

    // Wrap the function to enqueue instead of executing directly
    const wrappedFn = async function (this: unknown, ...args: unknown[]): Promise<TaskJob> {
      const queue = getTaskQueue();
      return queue.enqueue(taskName, args, { queue: options.queue });
    };

    // Add .delay() method for delayed execution
    (wrappedFn as unknown as Record<string, unknown>).delay = async function (
      this: unknown,
      delaySeconds: number,
      ...args: unknown[]
    ): Promise<TaskJob> {
      const queue = getTaskQueue();
      return queue.enqueue(taskName, args, { delay: delaySeconds, queue: options.queue });
    };

    // Register the handler with the queue
    const queue = getTaskQueue();
    queue.registerHandler(taskName, originalFn.bind(target), options);

    descriptor.value = wrappedFn;
  };
}

/**
 * Programmatic task registration (for use without decorators).
 *
 *   const sendEmail = createTask('sendEmail', async (to: string) => {
 *     await emailService.send(to, 'Hello!');
 *   }, { queue: 'emails', retries: 3 });
 *
 *   await sendEmail('user@example.com');
 *   await sendEmail.delay(60, 'user@example.com');
 */
export function createTask<TArgs extends unknown[]>(
  name: string,
  handler: (...args: TArgs) => Promise<unknown>,
  options: TaskOptions = {}
): ((...args: TArgs) => Promise<TaskJob>) & { delay: (seconds: number, ...args: TArgs) => Promise<TaskJob> } {
  const queue = getTaskQueue();
  queue.registerHandler(name, handler as (...args: unknown[]) => Promise<unknown>, options);

  const fn = async (...args: TArgs): Promise<TaskJob> => {
    return queue.enqueue(name, args, { queue: options.queue });
  };

  fn.delay = async (seconds: number, ...args: TArgs): Promise<TaskJob> => {
    return queue.enqueue(name, args, { delay: seconds, queue: options.queue });
  };

  return fn;
}

// ─── Task Admin API ──────────────────────────────────────────────────────────

/**
 * Create admin routes for task monitoring.
 */
export function createTaskAdminRoutes(): import('express').Router {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { Router } = require('express') as typeof import('express');
  const router = Router();

  // GET / — List all jobs
  router.get('/', async (req: import('express').Request, res: import('express').Response) => {
    const queue = getTaskQueue();
    const status = req.query.status as TaskStatus | undefined;
    const queueName = req.query.queue as string | undefined;
    const jobs = await queue.getJobs(status, queueName);
    res.json({ jobs, count: jobs.length });
  });

  // GET /stats — Queue stats
  router.get('/stats', async (_req: import('express').Request, res: import('express').Response) => {
    const queue = getTaskQueue();
    const stats = await queue.stats();
    res.json(stats);
  });

  // GET /:id — Job status
  router.get('/:id', async (req: import('express').Request, res: import('express').Response) => {
    const queue = getTaskQueue();
    const job = await queue.getJobStatus(String(req.params.id));
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }
    res.json(job);
  });

  // POST /:id/cancel — Cancel a job
  router.post('/:id/cancel', async (req: import('express').Request, res: import('express').Response) => {
    const queue = getTaskQueue();
    const cancelled = await queue.cancelJob(String(req.params.id));
    if (!cancelled) {
      res.status(400).json({ error: 'Could not cancel job' });
      return;
    }
    res.json({ success: true });
  });

  return router;
}
