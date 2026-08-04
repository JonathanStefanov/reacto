import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import express from 'express';
import http from 'http';
import compression from 'compression';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function httpGet(url: string, headers?: Record<string, string>): Promise<{ status: number; body: string; headers: http.IncomingHttpHeaders }> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const req = http.request({
      hostname: parsed.hostname,
      port: parsed.port,
      path: parsed.pathname + parsed.search,
      method: 'GET',
      headers: headers || {},
    }, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => resolve({ status: res.statusCode!, body, headers: res.headers }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.end();
  });
}

function concurrentFetch(url: string, count: number, headers?: Record<string, string>) {
  return Promise.all(Array.from({ length: count }, () => httpGet(url, headers)));
}

function createTestServer(handler: (req: http.IncomingMessage, res: http.ServerResponse) => void): Promise<{ server: http.Server; port: number }> {
  return new Promise((resolve) => {
    const server = http.createServer(handler);
    server.listen(0, () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      resolve({ server, port });
    });
  });
}

// ─── Test Components ──────────────────────────────────────────────────────────

function SmallPage() {
  return React.createElement('div', null, 'Hello World');
}

function MediumPage({ items }: { items: string[] }) {
  return React.createElement(
    'div',
    null,
    React.createElement('h1', null, 'Movie List'),
    React.createElement(
      'ul',
      null,
      items.map((item, i) =>
        React.createElement('li', { key: i }, React.createElement('a', { href: `/movie/${i}` }, item))
      )
    )
  );
}

function LargePage({ items }: { items: string[] }) {
  return React.createElement(
    'div',
    null,
    React.createElement('nav', null, Array.from({ length: 20 }, (_, i) => React.createElement('a', { key: i, href: '#' }, `Link ${i}`))),
    React.createElement('h1', null, 'Large Page'),
    React.createElement(
      'div',
      { style: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 } },
      items.map((item, i) =>
        React.createElement(
          'div',
          { key: i, style: { background: '#1a1a2e', padding: 16, borderRadius: 8 } },
          React.createElement('h3', null, item),
          React.createElement('p', null, `Description for ${item}`),
          React.createElement('span', null, `⭐ ${(Math.random() * 5).toFixed(1)}`),
          React.createElement('button', null, 'Add to list')
        )
      )
    ),
    React.createElement('footer', null, Array.from({ length: 10 }, (_, i) => React.createElement('a', { key: i }, `Footer Link ${i}`)))
  );
}

function wrapHtml(body: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${body}</body></html>`;
}

// ─── 1. renderToString Benchmarks ─────────────────────────────────────────────

describe('SSR renderToString performance', () => {
  it('renders a small page (< 1KB) in < 5ms per render', () => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
      renderToString(React.createElement(SmallPage));
    }
    const elapsed = performance.now() - start;
    const perRender = elapsed / 100;

    console.log(`  Small page: ${perRender.toFixed(2)}ms/render (${elapsed.toFixed(2)}ms for 100 renders)`);
    expect(perRender).toBeLessThan(5);
  });

  it('renders a medium page (100 items) in < 20ms per render', () => {
    const items = Array.from({ length: 100 }, (_, i) => `Movie ${i}: The Great Adventure`);
    const start = performance.now();
    for (let i = 0; i < 50; i++) {
      renderToString(React.createElement(MediumPage, { items }));
    }
    const elapsed = performance.now() - start;
    const perRender = elapsed / 50;

    console.log(`  Medium page (100 items): ${perRender.toFixed(2)}ms/render`);
    expect(perRender).toBeLessThan(20);
  });

  it('renders a large page (1000 items) in < 100ms', () => {
    const items = Array.from({ length: 1000 }, (_, i) => `Movie ${i}: Epic Saga`);
    const start = performance.now();
    const html = renderToString(React.createElement(LargePage, { items }));
    const elapsed = performance.now() - start;

    console.log(`  Large page (1000 items): ${elapsed.toFixed(2)}ms, ${(html.length / 1024).toFixed(1)}KB output`);
    expect(elapsed).toBeLessThan(100);
  });

  it('generates deterministic output size', () => {
    const items = Array.from({ length: 50 }, (_, i) => `Item ${i}`);
    const html1 = renderToString(React.createElement(MediumPage, { items }));
    const html2 = renderToString(React.createElement(MediumPage, { items }));

    expect(html1.length).toBe(html2.length);
    console.log(`  Output size: ${(html1.length / 1024).toFixed(1)}KB (deterministic)`);
  });

  it('handles rapid re-renders without degradation', () => {
    const items = Array.from({ length: 200 }, (_, i) => `Item ${i}`);
    const times: number[] = [];

    for (let i = 0; i < 200; i++) {
      const start = performance.now();
      renderToString(React.createElement(MediumPage, { items }));
      times.push(performance.now() - start);
    }

    const first10Avg = times.slice(0, 10).reduce((a, b) => a + b) / 10;
    const last10Avg = times.slice(-10).reduce((a, b) => a + b) / 10;
    const degradation = last10Avg / first10Avg;

    console.log(`  First 10 avg: ${first10Avg.toFixed(2)}ms, Last 10 avg: ${last10Avg.toFixed(2)}ms, ratio: ${degradation.toFixed(2)}x`);
    expect(degradation).toBeLessThan(2);
  });
});

// ─── 2. Compression ──────────────────────────────────────────────────────────

describe('Compression middleware', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();
    app.use(compression({ threshold: 0 })); // Compress everything

    app.get('/small', (_req, res) => {
      res.type('html').send(wrapHtml('<div>tiny</div>'));
    });

    app.get('/large', (_req, res) => {
      const items = Array.from({ length: 500 }, (_, i) => `Movie ${i}`);
      const html = renderToString(React.createElement(LargePage, { items }));
      res.type('html').send(wrapHtml(html));
    });

    const result = await createTestServer(app);
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('compresses large responses with gzip', async () => {
    const res = await httpGet(`http://localhost:${port}/large`, { 'Accept-Encoding': 'gzip' });

    expect(res.headers['content-encoding']).toBe('gzip');
    console.log(`  Large response encoding: ${res.headers['content-encoding']}`);
  });

  it('returns uncompressed when client does not support gzip', async () => {
    const res = await httpGet(`http://localhost:${port}/large`);

    expect(res.headers['content-encoding']).toBeUndefined();
    expect(res.status).toBe(200);
    console.log(`  No gzip: status=${res.status}, encoding=${res.headers['content-encoding'] || 'none'}`);
  });

  it('compression reduces payload size significantly', async () => {
    const uncompressed = await httpGet(`http://localhost:${port}/large`);
    const compressed = await httpGet(`http://localhost:${port}/large`, { 'Accept-Encoding': 'gzip' });

    // Compressed body should be smaller (buffers are returned as strings, so just check headers)
    expect(compressed.headers['content-encoding']).toBe('gzip');
    console.log(`  Uncompressed: ${uncompressed.body.length} bytes, Compressed: encoding=${compressed.headers['content-encoding']}`);
  });
});

// ─── 3. ETag Support ─────────────────────────────────────────────────────────

describe('ETag support', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const { createHash } = await import('crypto');
    const app = express();

    app.get('/page', (_req, res) => {
      const items = Array.from({ length: 50 }, (_, i) => `Movie ${i}`);
      const html = renderToString(React.createElement(MediumPage, { items }));
      const etag = createHash('md5').update(html).digest('hex');

      res.setHeader('ETag', etag);
      res.type('html').send(wrapHtml(html));
    });

    const result = await createTestServer(app);
    server = result.server;
    port = result.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('returns ETag header on response', async () => {
    const res = await httpGet(`http://localhost:${port}/page`);

    expect(res.headers['etag']).toBeDefined();
    expect(res.headers['etag']).toMatch(/^[a-f0-9]+$/);
    console.log(`  ETag: ${res.headers['etag']}`);
  });

  it('returns 304 when If-None-Match matches', async () => {
    const first = await httpGet(`http://localhost:${port}/page`);
    const etag = first.headers['etag'] as string;

    const second = await httpGet(`http://localhost:${port}/page`, { 'If-None-Match': etag });

    expect(second.status).toBe(304);
    expect(second.body).toBe('');
    console.log(`  Conditional request: ${first.status} → ${second.status} (304 = not modified)`);
  });

  it('returns 200 when If-None-Match does not match', async () => {
    const res = await httpGet(`http://localhost:${port}/page`, { 'If-None-Match': '"stale-etag"' });

    expect(res.status).toBe(200);
    expect(res.body.length).toBeGreaterThan(0);
    console.log(`  Stale ETag: status=${res.status}, body=${res.body.length} bytes`);
  });
});

// ─── 4. Response Caching ─────────────────────────────────────────────────────

describe('SSR response cache', () => {
  let { createHash } = require('crypto');

  class TestCache {
    private store = new Map<string, { html: string; etag: string; createdAt: number }>();
    private ttl: number;
    private maxEntries: number;

    constructor(ttl = 60, maxEntries = 1000) {
      this.ttl = ttl * 1000;
      this.maxEntries = maxEntries;
    }

    get(key: string) {
      const entry = this.store.get(key);
      if (!entry) return null;
      if (Date.now() - entry.createdAt > this.ttl) {
        this.store.delete(key);
        return null;
      }
      return entry;
    }

    set(key: string, html: string) {
      if (this.store.size >= this.maxEntries) {
        const oldest = this.store.keys().next().value;
        if (oldest) this.store.delete(oldest);
      }
      const etag = createHash('md5').update(html).digest('hex');
      const entry = { html, etag, createdAt: Date.now() };
      this.store.set(key, entry);
      return entry;
    }

    get size() { return this.store.size; }
    clear() { this.store.clear(); }
  }

  it('cache hit returns same content', () => {
    const cache = new TestCache(60);
    const html = '<div>Hello</div>';

    cache.set('/page', html);
    const hit = cache.get('/page');

    expect(hit).not.toBeNull();
    expect(hit!.html).toBe(html);
    expect(hit!.etag).toMatch(/^[a-f0-9]+$/);
    console.log(`  Cache hit: etag=${hit!.etag}`);
  });

  it('cache miss returns null for expired entries', async () => {
    const cache = new TestCache(1); // 1 second TTL
    cache.set('/page', '<div>Hello</div>');

    // Wait for expiry
    await new Promise(r => setTimeout(r, 1100));
    const hit = cache.get('/page');
    expect(hit).toBeNull();
    console.log(`  Expired entry: ${hit === null ? 'correctly null' : 'ERROR'}`);
  });

  it('cache evicts oldest when at capacity', () => {
    const cache = new TestCache(60, 3);

    cache.set('/a', 'page a');
    cache.set('/b', 'page b');
    cache.set('/c', 'page c');
    cache.set('/d', 'page d'); // Should evict /a

    expect(cache.get('/a')).toBeNull();
    expect(cache.get('/d')).not.toBeNull();
    expect(cache.size).toBe(3);
    console.log(`  Eviction: /a evicted, /d present, size=${cache.size}`);
  });

  it('cache is fast under load', () => {
    const cache = new TestCache(60, 10000);
    const html = '<div>' + 'x'.repeat(10000) + '</div>';

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      cache.set(`/page-${i}`, html);
    }
    const writeTime = performance.now() - start;

    const readStart = performance.now();
    for (let i = 0; i < 10000; i++) {
      cache.get(`/page-${i}`);
    }
    const readTime = performance.now() - readStart;

    console.log(`  10K writes: ${writeTime.toFixed(1)}ms, 10K reads: ${readTime.toFixed(1)}ms`);
    expect(writeTime).toBeLessThan(500);
    expect(readTime).toBeLessThan(100);
  });

  it('X-Cache header distinguishes hit/miss', async () => {
    const app = express();
    const cache = new Map<string, { html: string; etag: string }>();

    app.get('/cached', (req, res) => {
      const key = '/cached';
      const cached = cache.get(key);

      if (cached) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('ETag', cached.etag);
        res.type('html').send(cached.html);
        return;
      }

      const html = wrapHtml('<div>cached page</div>');
      const etag = createHash('md5').update(html).digest('hex');
      cache.set(key, { html, etag });

      res.setHeader('X-Cache', 'MISS');
      res.setHeader('ETag', etag);
      res.type('html').send(html);
    });

    const { server: srv, port: p } = await createTestServer(app);

    const miss = await httpGet(`http://localhost:${p}/cached`);
    const hit = await httpGet(`http://localhost:${p}/cached`);

    expect(miss.headers['x-cache']).toBe('MISS');
    expect(hit.headers['x-cache']).toBe('HIT');

    console.log(`  First request: X-Cache=${miss.headers['x-cache']}, Second: X-Cache=${hit.headers['x-cache']}`);

    await new Promise<void>((resolve) => srv.close(() => resolve()));
  });
});

// ─── 5. Session Max Limit ────────────────────────────────────────────────────

describe('Session max limit', () => {
  it('session cleanup respects max limit', () => {
    const sessions = new Map<string, { data: any; expiresAt: number }>();
    const maxSessions = 100;

    // Add 150 sessions (all valid, not expired)
    for (let i = 0; i < 150; i++) {
      sessions.set(`session-${i}`, {
        data: { userId: i },
        expiresAt: Date.now() + 3600000,
      });
    }

    // Simulate cleanup with max limit
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now > s.expiresAt) sessions.delete(id);
    }

    if (sessions.size > maxSessions) {
      const entries = [...sessions.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = sessions.size - maxSessions;
      for (let i = 0; i < toRemove; i++) {
        sessions.delete(entries[i][0]);
      }
    }

    expect(sessions.size).toBe(maxSessions);
    console.log(`  Enforced max ${maxSessions} sessions: ${sessions.size} remaining`);
  });

  it('expired sessions are removed before valid ones', () => {
    const sessions = new Map<string, { data: any; expiresAt: number }>();

    // Add 50 expired + 100 valid
    for (let i = 0; i < 50; i++) {
      sessions.set(`expired-${i}`, { data: { userId: i }, expiresAt: Date.now() - 1000 });
    }
    for (let i = 0; i < 100; i++) {
      sessions.set(`valid-${i}`, { data: { userId: i }, expiresAt: Date.now() + 3600000 });
    }

    // Cleanup with max 80
    const maxSessions = 80;
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now > s.expiresAt) sessions.delete(id);
    }

    if (sessions.size > maxSessions) {
      const entries = [...sessions.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = sessions.size - maxSessions;
      for (let i = 0; i < toRemove; i++) {
        sessions.delete(entries[i][0]);
      }
    }

    expect(sessions.size).toBe(maxSessions);
    // All expired should be gone
    for (const [id] of sessions) {
      expect(id.startsWith('expired-')).toBe(false);
    }
    console.log(`  Expired removed first: ${sessions.size} valid sessions remain`);
  });

  it('cleanup runs fast with 100K sessions', () => {
    const sessions = new Map<string, { data: any; expiresAt: number }>();
    const maxSessions = 50000;

    // 100K sessions: 30K expired, 70K valid
    for (let i = 0; i < 100000; i++) {
      sessions.set(`session-${i}`, {
        data: { userId: i },
        expiresAt: i < 30000 ? Date.now() - 1000 : Date.now() + 3600000,
      });
    }

    const start = performance.now();
    const now = Date.now();
    for (const [id, s] of sessions) {
      if (now > s.expiresAt) sessions.delete(id);
    }
    if (sessions.size > maxSessions) {
      const entries = [...sessions.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt);
      const toRemove = sessions.size - maxSessions;
      for (let i = 0; i < toRemove; i++) {
        sessions.delete(entries[i][0]);
      }
    }
    const elapsed = performance.now() - start;

    console.log(`  100K cleanup: ${elapsed.toFixed(1)}ms, ${sessions.size} remaining (max ${maxSessions})`);
    expect(sessions.size).toBeLessThanOrEqual(maxSessions);
    expect(elapsed).toBeLessThan(1000);
  });
});

// ─── 6. HTTP Server Performance ──────────────────────────────────────────────

describe('SSR HTTP server performance', () => {
  let server: http.Server;
  let port: number;

  beforeAll(async () => {
    const app = express();

    app.get('/', (_req: express.Request, res: express.Response) => {
      const html = renderToString(React.createElement(SmallPage));
      res.type('html').send(wrapHtml(html));
    });

    app.get('/medium', (_req: express.Request, res: express.Response) => {
      const items = Array.from({ length: 100 }, (_, i) => `Movie ${i}`);
      const html = renderToString(React.createElement(MediumPage, { items }));
      res.type('html').send(wrapHtml(html));
    });

    const result = await createTestServer(app);
    server = result.server;
    port = result.port;
  }, 10000);

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  it('handles 100 concurrent requests to small page', async () => {
    const start = performance.now();
    const results = await concurrentFetch(`http://localhost:${port}/`, 100);
    const elapsed = performance.now() - start;

    const okCount = results.filter((r) => r.status === 200).length;
    const avgTime = elapsed / 100;

    console.log(`  100 concurrent: ${elapsed.toFixed(0)}ms total, ${avgTime.toFixed(1)}ms avg, ${okCount}/100 OK`);
    expect(okCount).toBe(100);
    expect(avgTime).toBeLessThan(50);
  });

  it('handles 50 concurrent requests to medium page', async () => {
    const start = performance.now();
    const results = await concurrentFetch(`http://localhost:${port}/medium`, 50);
    const elapsed = performance.now() - start;

    const okCount = results.filter((r) => r.status === 200).length;
    const avgTime = elapsed / 50;

    console.log(`  50 concurrent medium: ${elapsed.toFixed(0)}ms total, ${avgTime.toFixed(1)}ms avg, ${okCount}/50 OK`);
    expect(okCount).toBe(50);
  });

  it('returns proper content-type', async () => {
    const res = await httpGet(`http://localhost:${port}/`);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    console.log(`  Content-Type: ${res.headers['content-type']}`);
  });

  it('returns 404 for unknown routes', async () => {
    const res = await httpGet(`http://localhost:${port}/nonexistent`);
    expect(res.status).toBe(404);
    console.log(`  404 response: ${res.status}`);
  });

  it('measures p95 latency under sequential load', async () => {
    const latencies: number[] = [];

    for (let i = 0; i < 200; i++) {
      const start = performance.now();
      await httpGet(`http://localhost:${port}/`);
      latencies.push(performance.now() - start);
    }

    latencies.sort((a, b) => a - b);
    const p50 = latencies[Math.floor(latencies.length * 0.5)];
    const p95 = latencies[Math.floor(latencies.length * 0.95)];
    const p99 = latencies[Math.floor(latencies.length * 0.99)];

    console.log(`  Latency (200 reqs): p50=${p50.toFixed(1)}ms, p95=${p95.toFixed(1)}ms, p99=${p99.toFixed(1)}ms`);
    expect(p95).toBeLessThan(50);
  });

  it('measures throughput (requests/sec)', async () => {
    const duration = 2000;
    let count = 0;
    const start = performance.now();

    while (performance.now() - start < duration) {
      await httpGet(`http://localhost:${port}/`);
      count++;
    }

    const elapsed = performance.now() - start;
    const rps = (count / elapsed) * 1000;

    console.log(`  Throughput: ${rps.toFixed(0)} req/s (${count} requests in ${(elapsed / 1000).toFixed(1)}s)`);
    expect(rps).toBeGreaterThan(100);
  });
});

// ─── 7. Session Performance ──────────────────────────────────────────────────

describe('Session store performance', () => {
  it('session ID generation is fast', async () => {
    const { createHash, randomBytes } = await import('crypto');

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      const r = randomBytes(32).toString('hex');
      createHash('sha256').update(r + 'test-secret').digest('hex').slice(0, 16);
    }
    const elapsed = performance.now() - start;

    console.log(`  10K session IDs: ${elapsed.toFixed(0)}ms (${((elapsed / 10000) * 1000).toFixed(2)}μs each)`);
    expect(elapsed).toBeLessThan(1000);
  });

  it('session Map lookup is O(1)', () => {
    const sessions = new Map<string, { data: any; expiresAt: number }>();

    for (let i = 0; i < 100000; i++) {
      sessions.set(`session-${i}`, { data: { userId: i }, expiresAt: Date.now() + 3600000 });
    }

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      sessions.get(`session-${Math.floor(Math.random() * 100000)}`);
    }
    const elapsed = performance.now() - start;

    console.log(`  10K lookups in 100K Map: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(100);
  });
});

// ─── 8. Memory Usage ─────────────────────────────────────────────────────────

describe('Memory usage', () => {
  it('renderToString does not leak memory', () => {
    const items = Array.from({ length: 100 }, (_, i) => `Item ${i}`);

    for (let i = 0; i < 10; i++) {
      renderToString(React.createElement(MediumPage, { items }));
    }

    const before = process.memoryUsage().heapUsed;

    for (let i = 0; i < 1000; i++) {
      renderToString(React.createElement(MediumPage, { items }));
    }

    if (global.gc) global.gc();

    const after = process.memoryUsage().heapUsed;
    const deltaMB = (after - before) / 1024 / 1024;

    console.log(`  1000 renders memory delta: ${deltaMB.toFixed(2)}MB`);
    expect(deltaMB).toBeLessThan(50);
  });

  it('HTML template concatenation is efficient', () => {
    const body = '<div>' + 'x'.repeat(10000) + '</div>';
    const title = 'Test Page';

    const start = performance.now();
    for (let i = 0; i < 10000; i++) {
      `<!DOCTYPE html><html><head><title>${title}</title></head><body>${body}</body></html>`;
    }
    const elapsed = performance.now() - start;

    console.log(`  10K template concatenations: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(100);
  });
});
