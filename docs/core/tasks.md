# Background Tasks

Run code asynchronously with retry, backoff, and monitoring.

## Defining Tasks

### Decorator Style

```typescript
import { task } from '@reacto-org/ssr';

export const sendEmail = task('sendEmail', async (userId: number) => {
  const user = await ModelManager.objects(User).get({ id: userId });
  await emailService.send(user.email, 'Hello!');
}, { queue: 'emails', retries: 3 });
```

### Programmatic Style

```typescript
import { createTask } from '@reacto-org/core';

export const sendEmail = createTask('sendEmail', async (userId: number) => {
  const user = await ModelManager.objects(User).get({ id: userId });
  await emailService.send(user.email, 'Hello!');
}, { queue: 'emails', retries: 3 });
```

## Running Tasks

```typescript
// Immediate execution
const job = await sendEmail.run(42);

// Delayed execution (60 seconds)
const job = await sendEmail.delay(60, 42);
```

## Task Options

```typescript
task('myTask', handler, {
  queue: 'emails',     // Queue name (default: 'default')
  retries: 3,          // Max retry attempts (default: 3)
  retryDelay: 1000,    // Base retry delay in ms (default: 1000)
  timeout: 30000,      // Task timeout in ms (default: 30000)
  name: 'my-task',     // Task name (default: function name)
});
```

## Task Status

```typescript
const job = await sendEmail.run(42);

console.log(job.id);         // Unique job ID
console.log(job.status);     // 'pending' | 'running' | 'completed' | 'failed'
console.log(job.attempts);   // Number of attempts
console.log(job.result);     // Result (if completed)
console.log(job.error);      // Error message (if failed)
console.log(job.duration);   // Execution time in ms
```

## Queue Monitoring

```typescript
import { getTaskQueue } from '@reacto-org/core';

const queue = getTaskQueue();

// Get stats
const stats = await queue.stats();
// { pending: 5, running: 2, completed: 100, failed: 3, total: 110 }

// Get all jobs
const jobs = await queue.getJobs();

// Get jobs by status
const failed = await queue.getJobs('failed');

// Get specific job
const job = await queue.getJobStatus('task_123');

// Cancel a job
await queue.cancelJob('task_123');
```

## Retry with Exponential Backoff

Failed tasks are retried with exponential backoff:

```
Attempt 1: fail → wait 1s
Attempt 2: fail → wait 2s
Attempt 3: fail → wait 4s
Attempt 4: fail → mark as failed
```

## Multiple Queues

```typescript
const emailTask = task('sendEmail', handler, { queue: 'emails' });
const imageTask = task('processImage', handler, { queue: 'images' });

// Each queue processes independently
```

## Admin API

Tasks are monitored at `/api/_admin/tasks`:

| Endpoint | Description |
|---|---|
| `GET /api/_admin/tasks` | List all jobs |
| `GET /api/_admin/tasks/stats` | Queue statistics |
| `GET /api/_admin/tasks/:id` | Job status |
| `POST /api/_admin/tasks/:id/cancel` | Cancel a job |
