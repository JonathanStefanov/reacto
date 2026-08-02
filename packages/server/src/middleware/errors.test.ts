import { describe, it, expect, vi } from 'vitest';
import { errorHandler, notFoundHandler } from './errors.js';

function createMockRes() {
  const res: any = {
    statusCode: 200,
    body: null as any,
    status(code: number) {
      res.statusCode = code;
      return res;
    },
    json(data: any) {
      res.body = data;
      return res;
    },
  };
  return res;
}

describe('errorHandler', () => {
  it('returns 500 for errors without statusCode', () => {
    const err = new Error('Something broke');
    const req = {} as any;
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body.error.message).toBe('Something broke');
    expect(res.body.error.code).toBe('INTERNAL_ERROR');
  });

  it('returns the custom statusCode when provided', () => {
    const err: any = new Error('Not Found');
    err.statusCode = 404;
    err.code = 'NOT_FOUND';
    const req = {} as any;
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('Not Found');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for bad request errors', () => {
    const err: any = new Error('Bad request');
    err.statusCode = 400;
    const req = {} as any;
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.statusCode).toBe(400);
  });

  it('includes stack trace in development mode', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const err = new Error('Dev error');
    const req = {} as any;
    const res = createMockRes();
    const next = vi.fn();

    errorHandler(err, req, res, next);

    expect(res.body.error.stack).toBeDefined();

    process.env.NODE_ENV = original;
  });
});

describe('notFoundHandler', () => {
  it('returns 404 with NOT_FOUND code', () => {
    const req = {} as any;
    const res = createMockRes();

    notFoundHandler(req, res);

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toBe('Not Found');
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
