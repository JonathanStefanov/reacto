# Client Components

React components that hydrate on the client for interactivity.

## Overview

Server components render HTML. Client components add interactivity:

```
Server renders HTML (movie list, forms)
       ↓
Client loads minimal JS (~3KB)
       ↓
Client hydrates interactive components (chat, live feed)
```

## WSProvider

WebSocket context provider. Wrap your app to enable real-time features.

```tsx
import { WSProvider } from '@reacto-org/ssr';

<WSProvider>
  <App />
</WSProvider>
```

## useWS Hook

Access WebSocket in any component.

```tsx
import { useWS } from '@reacto-org/ssr';

function MyComponent() {
  const { connected, subscribe, send, on } = useWS();

  useEffect(() => {
    subscribe('notifications');
    return on('notification', (data) => {
      console.log('New notification:', data);
    });
  }, []);

  return <div>{connected ? '🟢' : '🔴'}</div>;
}
```

**Returns:**
- `connected`: boolean — WebSocket connection status
- `subscribe(channel)`: Subscribe to a channel
- `send(type, data)`: Send a message
- `on(type, handler)`: Listen for messages (returns unsubscribe function)

## ChatPanel

Real-time chat component.

```tsx
import { ChatPanel } from '@reacto-org/ssr';

<ChatPanel channel="general" />
```

**Props:**
- `channel`: string (default: `'general'`)
- `className`: string
- `style`: CSSProperties

## LiveFeed

Shows live events from WebSocket.

```tsx
import { LiveFeed } from '@reacto-org/ssr';

<LiveFeed
  types={['new-review', 'new-user']}
  maxItems={20}
  renderItem={(item) => (
    <div>{item.type}: {JSON.stringify(item.data)}</div>
  )}
/>
```

**Props:**
- `types`: string[] — Event types to listen for
- `maxItems`: number — Max items to show
- `renderItem`: function — Custom render function

## RealTime

Subscribe to a WebSocket event and render children with the data.

```tsx
import { RealTime } from '@reacto-org/ssr';

<RealTime type="new-review">
  {(data) => <ReviewNotification data={data} />}
</RealTime>
```

## ConnectionStatus

Shows WebSocket connection status.

```tsx
import { ConnectionStatus } from '@reacto-org/ssr';

<ConnectionStatus />
// Renders: 🟢 Live or 🔴 Offline
```

## Example: Movie App with Chat

```tsx
// views/HomePage.tsx
import { serverComponent, ModelManager } from '@reacto-org/ssr';
import { ChatPanel } from '@reacto-org/ssr/client';
import { Movie } from '../models/index.js';

export default serverComponent(async (ctx) => {
  const movies = await ModelManager.objects(Movie).all();

  return (
    <div style={{ display: 'flex' }}>
      <div style={{ flex: 1 }}>
        {movies.map(m => <MovieCard key={m.id} movie={m} />)}
      </div>
      <div style={{ width: 380 }}>
        <ChatPanel channel="general" />
      </div>
    </div>
  );
});
```
