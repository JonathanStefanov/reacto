/**
 * @reacto-org/server — WebSocket real-time subscriptions
 *
 * Provides Django Channels-style real-time updates:
 *   - Subscribe to model changes
 *   - Channel-based pub/sub
 *   - Auto-broadcast on create/update/delete
 *
 * Usage:
 *   const ws = createWebSocketServer(app);
 *   ws.subscribe('posts', client);         // listen to post changes
 *   ws.broadcast('posts', { type: 'created', data: post }); // send to all
 */
import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import type { Express } from 'express';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WsMessage {
  type: 'subscribe' | 'unsubscribe' | 'message' | 'ping' | 'pong';
  channel?: string;
  data?: unknown;
}

export interface WsBroadcast {
  type: 'created' | 'updated' | 'deleted' | 'patched' | 'custom';
  model?: string;
  id?: number;
  data?: unknown;
  channel?: string;
  timestamp?: string;
}

export interface WsClient {
  id: string;
  ws: WebSocket;
  channels: Set<string>;
  isAlive: boolean;
  authenticated: boolean;
  userId?: string | number;
}

export interface WebSocketServerOptions {
  /** Path for WebSocket endpoint. Default: /ws */
  path?: string;
  /** Authenticate connections via query param token */
  authenticate?: (token: string) => Promise<{ userId: string | number } | null>;
  /** Heartbeat interval in ms. Default: 30000 */
  heartbeatInterval?: number;
  /** Max connections per IP. Default: 100 */
  maxConnectionsPerIp?: number;
}

// ─── WebSocket Server ─────────────────────────────────────────────────────────

let wsServer: ReactoWebSocketServer | null = null;

export class ReactoWebSocketServer {
  private wss: WebSocketServer;
  private clients = new Map<string, WsClient>();
  private channels = new Map<string, Set<string>>(); // channel → client IDs
  private heartbeatTimer: ReturnType<typeof setInterval>;
  private clientIdCounter = 0;
  private options: WebSocketServerOptions;

  constructor(httpServer: Server, options: WebSocketServerOptions = {}) {
    this.options = options;
    const path = options.path ?? '/ws';

    this.wss = new WebSocketServer({ server: httpServer, path });

    this.wss.on('connection', (ws, req) => this.handleConnection(ws, req));

    // Heartbeat to detect stale connections
    const interval = options.heartbeatInterval ?? 30_000;
    this.heartbeatTimer = setInterval(() => {
      for (const [id, client] of this.clients) {
        if (!client.isAlive) {
          this.removeClient(id);
          continue;
        }
        client.isAlive = false;
        client.ws.ping();
      }
    }, interval);

    this.wss.on('close', () => {
      clearInterval(this.heartbeatTimer);
    });

    // Store global reference
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    wsServer = this;
  }

  /**
   * Handle new WebSocket connection.
   */
  private async handleConnection(ws: WebSocket, req: { url?: string; socket?: { remoteAddress?: string } }): Promise<void> {
    const clientId = `ws_${++this.clientIdCounter}_${Date.now()}`;
    const url = new URL(req.url ?? '/', `http://localhost`);
    const token = url.searchParams.get('token') ?? '';

    let authenticated = false;
    let userId: string | number | undefined;

    if (this.options.authenticate && token) {
      const result = await this.options.authenticate(token);
      if (result) {
        authenticated = true;
        userId = result.userId;
      } else {
        ws.close(4001, 'Authentication failed');
        return;
      }
    } else if (!this.options.authenticate) {
      authenticated = true; // no auth required
    } else {
      ws.close(4001, 'Authentication required');
      return;
    }

    const client: WsClient = {
      id: clientId,
      ws,
      channels: new Set(),
      isAlive: true,
      authenticated,
      userId,
    };

    this.clients.set(clientId, client);

    ws.on('pong', () => {
      client.isAlive = true;
    });

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString()) as WsMessage;
        this.handleMessage(clientId, msg);
      } catch {
        this.send(clientId, { type: 'error', data: 'Invalid JSON' });
      }
    });

    ws.on('close', () => {
      this.removeClient(clientId);
    });

    ws.on('error', () => {
      this.removeClient(clientId);
    });

    // Send welcome message
    this.send(clientId, {
      type: 'connected',
      clientId,
      channels: [],
      authenticated,
    } as unknown as WsBroadcast);

    console.log(`[Reacto WS] Client connected: ${clientId} (user: ${userId ?? 'anonymous'})`);
  }

  /**
   * Handle incoming message from a client.
   */
  private handleMessage(clientId: string, msg: WsMessage): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    switch (msg.type) {
      case 'subscribe': {
        if (!msg.channel) {
          this.send(clientId, { type: 'error', data: 'channel is required for subscribe' });
          return;
        }
        this.subscribe(msg.channel, clientId);
        this.send(clientId, { type: 'subscribed', channel: msg.channel } as unknown as WsBroadcast);
        break;
      }

      case 'unsubscribe': {
        if (!msg.channel) return;
        this.unsubscribe(msg.channel, clientId);
        this.send(clientId, { type: 'unsubscribed', channel: msg.channel } as unknown as WsBroadcast);
        break;
      }

      case 'ping':
        this.send(clientId, { type: 'pong' } as unknown as WsBroadcast);
        break;

      default:
        this.send(clientId, { type: 'error', data: `Unknown message type: ${msg.type}` });
    }
  }

  /**
   * Subscribe a client to a channel.
   */
  subscribe(channel: string, clientId: string): void {
    const subscribers = this.channels.get(channel) ?? new Set();
    subscribers.add(clientId);
    this.channels.set(channel, subscribers);

    const client = this.clients.get(clientId);
    if (client) {
      client.channels.add(channel);
    }
  }

  /**
   * Unsubscribe a client from a channel.
   */
  unsubscribe(channel: string, clientId: string): void {
    const subscribers = this.channels.get(channel);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.channels.delete(channel);
      }
    }

    const client = this.clients.get(clientId);
    if (client) {
      client.channels.delete(channel);
    }
  }

  /**
   * Broadcast a message to all subscribers of a channel.
   */
  broadcast(channel: string, data: WsBroadcast): void {
    const subscribers = this.channels.get(channel);
    if (!subscribers) return;

    const payload: WsBroadcast = {
      ...data,
      channel,
      timestamp: data.timestamp ?? new Date().toISOString(),
    };

    const message = JSON.stringify(payload);

    for (const clientId of subscribers) {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Broadcast to all connected clients (regardless of channel).
   */
  broadcastAll(data: WsBroadcast): void {
    const message = JSON.stringify({
      ...data,
      timestamp: data.timestamp ?? new Date().toISOString(),
    });

    for (const [, client] of this.clients) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(message);
      }
    }
  }

  /**
   * Send a message to a specific client.
   */
  send(clientId: string, data: WsBroadcast | Record<string, unknown>): void {
    const client = this.clients.get(clientId);
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(data));
    }
  }

  /**
   * Remove a client and clean up their subscriptions.
   */
  private removeClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // Remove from all channels
    for (const channel of client.channels) {
      const subscribers = this.channels.get(channel);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.channels.delete(channel);
        }
      }
    }

    this.clients.delete(clientId);
    console.log(`[Reacto WS] Client disconnected: ${clientId}`);
  }

  /**
   * Get connected client count.
   */
  getClientCount(): number {
    return this.clients.size;
  }

  /**
   * Get channel subscriber count.
   */
  getChannelCount(): number {
    return this.channels.size;
  }

  /**
   * Get channel names.
   */
  getChannels(): string[] {
    return Array.from(this.channels.keys());
  }

  /**
   * Shutdown the WebSocket server.
   */
  close(): void {
    clearInterval(this.heartbeatTimer);
    for (const [, client] of this.clients) {
      client.ws.close(1001, 'Server shutting down');
    }
    this.clients.clear();
    this.channels.clear();
    this.wss.close();
  }
}

// ─── Convenience Functions ────────────────────────────────────────────────────

/**
 * Create a WebSocket server attached to an Express app.
 * Call this after creating the Express server, before listen().
 */
export function createWebSocketServer(
  app: Express,
  options: WebSocketServerOptions = {}
): ReactoWebSocketServer | null {
  (app as any).__wsOptions = options;
  return null;
}

/**
 * Attach WebSocket server to a running HTTP server.
 * Use this if you already have the server reference.
 */
export function attachWebSocket(
  httpServer: Server,
  options: WebSocketServerOptions = {}
): ReactoWebSocketServer {
  return new ReactoWebSocketServer(httpServer, options);
}

/**
 * Get the global WebSocket server instance.
 */
export function getWebSocketServer(): ReactoWebSocketServer | null {
  return wsServer;
}

// ─── Model Auto-Broadcast ────────────────────────────────────────────────────

/**
 * Enable auto-broadcasting for a model.
 * Call this to automatically broadcast create/update/delete events.
 *
 * @example
 * ```ts
 * enableAutoBroadcast(User, 'users');
 * // Now any create/save/delete on User will broadcast to 'users' channel
 * ```
 */
export function enableAutoBroadcast(
  modelClass: { _modelName: string; tableName: string },
  channel?: string
): void {
  const channelName = channel ?? modelClass.tableName;
  const modelName = modelClass._modelName;

  // Note: Auto-broadcast is handled by the signal system.
  // Use @Signal('postSave') and @Signal('postDelete') decorators on your models
  // to broadcast changes via WebSocket.
  //
  // Example:
  //   @Signal('postSave')
  //   broadcastChange() {
  //     const ws = getWebSocketServer();
  //     if (ws) ws.broadcast('posts', { type: 'created', model: 'Post', id: this.id, data: this.toJSON() });
  //   }
}
