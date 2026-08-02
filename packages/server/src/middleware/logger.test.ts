import { describe, it, expect, vi } from 'vitest';
import { requestLogger } from './logger.js';

describe('requestLogger', () => {
  it('calls next()', () => {
    const req = { method: 'GET', originalUrl: '/test' } as any;
    const res = {
      on: vi.fn(),
      statusCode: 200,
    } as any;
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(next).toHaveBeenCalledOnce();
  });

  it('registers a finish listener on the response', () => {
    const req = { method: 'GET', originalUrl: '/test' } as any;
    const res = {
      on: vi.fn(),
      statusCode: 200,
    } as any;
    const next = vi.fn();

    requestLogger(req, res, next);

    expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
  });

  it('logs the request when response finishes', () => {
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const req = { method: 'POST', originalUrl: '/api/users' } as any;

    let finishCallback: (() => void) | undefined;
    const res = {
      on: vi.fn((event: string, cb: () => void) => {
        if (event === 'finish') finishCallback = cb;
      }),
      statusCode: 201,
    } as any;
    const next = vi.fn();

    requestLogger(req, res, next);

    // Simulate response finish
    finishCallback?.();

    expect(consoleSpy).toHaveBeenCalledOnce();
    expect(consoleSpy.mock.calls[0][0]).toContain('POST');
    expect(consoleSpy.mock.calls[0][0]).toContain('/api/users');
    expect(consoleSpy.mock.calls[0][0]).toContain('201');

    consoleSpy.mockRestore();
  });
});
