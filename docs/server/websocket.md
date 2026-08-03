# WebSocket

Real-time communication with channel-based pub/sub.

## Setup

```typescript
import { createServer } from '@reacto-org/server';

const { ws } = createServer({
  websocket: true,
  // ... other options
});
```

## Server-Side API

### Subscribe Clients to Channels

```typescript
if (ws) {
  ws.on('connection', (client) => {
    // Subscribe to channels
    ws.subscribe('notifications', client.id);
    ws.subscribe('chat', client.id);
  });
}
```

### Broadcast to Channel

```typescript
// Send to all clients in channel
ws.broadcast('chat', {
  type: 'chat-message',
  data: { content: 'Hello!', user: 'john' },
});
```

### Send to Specific Client

```typescript
ws.send(clientId, {
  type: 'notification',
  data: { message: 'You have a new follower' },
});
```

### Handle Custom Messages

```typescript
ws.onMessage('chat-message', async (data, client) => {
  const message = await ModelManager.create(ChatMessage, {
    userId: client.userId,
    content: data.content,
  });

  ws.broadcast('chat', {
    type: 'chat-message',
    data: message.toJSON(),
  });
});
```

## Client-Side API

### Basic Connection

```javascript
const ws = new WebSocket('ws://localhost:3000/ws');

ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'subscribe', channel: 'chat' }));
};

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data);
  console.log(msg.type, msg.data);
};
```

### React Components

```tsx
import { WSProvider, useWS, ChatPanel } from '@reacto-org/ssr';

// Wrap app
<WSProvider>
  <App />
</WSProvider>

// Use in components
function MyComponent() {
  const { connected, send, on } = useWS();

  useEffect(() => {
    return on('chat-message', (data) => {
      console.log('New message:', data);
    });
  }, [on]);

  return <div>{connected ? '🟢' : '🔴'}</div>;
}

// Or use built-in ChatPanel
<ChatPanel channel="general" />
```

## Authentication

```typescript
const ws = new WebSocket('ws://localhost:3000/ws?token=my-jwt-token');

// Server validates token on connection
const { ws } = createServer({
  websocket: {
    authenticate: async (token) => {
      const payload = verifyJwt(token);
      return payload ? { userId: payload.userId } : null;
    },
  },
});
```

## Auto-Broadcast on Model Changes

```typescript
// Any save/delete on User broadcasts to 'users' channel
enableAutoBroadcast(User, ws);
```

## Events

| Event | Description |
|---|---|
| `connection` | Client connected |
| `subscribe` | Client subscribed to channel |
| `unsubscribe` | Client unsubscribed |
| `chat-message` | Custom message |
