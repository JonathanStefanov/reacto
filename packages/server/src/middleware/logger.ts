/**
 * @reacto/server — Request logger middleware
 */
import { Request, Response, NextFunction } from 'express';

/**
 * Log incoming requests.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;

    const statusColor = status >= 400 ? '\x1b[31m' : status >= 300 ? '\x1b[33m' : '\x1b[32m';
    const reset = '\x1b[0m';

    console.log(
      `[Reacto] ${method} ${url} ${statusColor}${status}${reset} ${duration}ms`
    );
  });

  next();
}
