/**
 * Reacto WebSocket Example — Real-time chat with model broadcasts
 *
 * Shows:
 *   1. WebSocket server with auth
 *   2. Subscribe/unsubscribe to channels
 *   3. Auto-broadcast model changes via @Signal
 *   4. Client-side usage (vanilla JS + React hook)
 */
import 'reflect-metadata';
import {
  Model,
  ModelDecor,
  Field,
  ForeignKey,
  Signal,
  configureDatabase,
  ModelManager,
} from '@reacto/core';
import { required, minLength } from '@reacto/core/src/validators/index.js';
import { signJwt, hashPassword, verifyPassword } from '@reacto/server/src/middleware/auth.js';
import { createServer, getWebSocketServer } from '@reacto/server';

// ─── Database ─────────────────────────────────────────────────────────────────

configureDatabase({
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432'),
  database: process.env.DB_NAME ?? 'reacto_ws_example',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
});

// ─── Models with auto-broadcast ───────────────────────────────────────────────

@ModelDecor({ tableName: 'users' })
class User extends Model {
  @Field({ type: 'string', maxLength: 150, unique: true, validators: [required(), minLength(3)] })
  username!: string;

  @Field({ type: 'email', validators: [required()] })
  email!: string;

  @Field({ type: 'string' })
  passwordHash!: string;
}

@ModelDecor({ tableName: 'messages' })
class Message extends Model {
  @Field({ type: 'text', validators: [required(), minLength(1)] })
  body!: string;

  @ForeignKey(() => User, { onDelete: 'CASCADE' })
  userId!: number;

  // Auto-broadcast when a message is created/updated
  @Signal('postSave')
  broadcastMessage() {
    const ws = getWebSocketServer();
    if (!ws) return;
    ws.broadcast('messages', {
      type: this.id ? 'updated' : 'created',
      model: 'Message',
      id: this.id,
      data: this.toJSON(),
    });
  }

  // Auto-broadcast when a message is deleted
  @Signal('postDelete')
  broadcastDelete() {
    const ws = getWebSocketServer();
    if (!ws) return;
    ws.broadcast('messages', {
      type: 'deleted',
      model: 'Message',
      id: this.id,
    });
  }
}

// ─── Server with WebSocket + Auth ─────────────────────────────────────────────

const JWT_SECRET = process.env.JWT_SECRET ?? 'super-secret-change-me';

const { server, ws } = createServer({
  websocket: {
    path: '/ws',
    heartbeatInterval: 30_000,
    // Authenticate WebSocket connections via ?token=jwt
    authenticate: async (token: string) => {
      try {
        const { verifyJwt } = await import('@reacto/server/src/middleware/auth.js');
        const payload = verifyJwt(token, JWT_SECRET);
        return { userId: payload.sub };
      } catch {
        return null;
      }
    },
  },
});

// Add REST endpoints for auth
import express from 'express';
const app = server.listeners('request')[0] as express.Express;

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const passwordHash = await hashPassword(password);
    const user = await ModelManager.create(User, { username, email, passwordHash });
    const token = signJwt({ sub: user.id, email }, JWT_SECRET, 86400);
    res.json({ user: user.toJSON(), token });
  } catch (err: unknown) {
    res.status(400).json({ error: (err as Error).message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await ModelManager.objects(User).get({ username });
    const valid = await verifyPassword(password, (user as any).passwordHash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
    const token = signJwt({ sub: user.id, email: (user as any).email }, JWT_SECRET, 86400);
    res.json({ user: user.toJSON(), token });
  } catch {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '3000');

server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║  Reacto WebSocket Example                                    ║
╠══════════════════════════════════════════════════════════════╣
║  REST API:  http://localhost:${PORT}/api                       ║
║  WebSocket: ws://localhost:${PORT}/ws                          ║
║  Health:    http://localhost:${PORT}/api/health                 ║
╚══════════════════════════════════════════════════════════════╝

Endpoints:
  POST /api/register   — Create account (returns JWT)
  POST /api/login      — Login (returns JWT)
  GET  /api/messages   — List messages
  POST /api/messages   — Create message (auto-broadcasts via WS)

WebSocket:
  Connect:  ws://localhost:${PORT}/ws?token=<JWT>
  Subscribe:  { "type": "subscribe", "channel": "messages" }
  Unsubscribe: { "type": "unsubscribe", "channel": "messages" }

  Incoming events:
    { "type": "created", "model": "Message", "id": 1, "data": {...} }
    { "type": "updated", "model": "Message", "id": 1, "data": {...} }
    { "type": "deleted", "model": "Message", "id": 1 }
`);
});

export { User, Message };
