# Error Handling

Built-in error handling for API and SSR.

## Error Handler

```typescript
import { errorHandler, notFoundHandler } from '@reacto-org/server';

// 404 handler
app.use(notFoundHandler);

// Error handler (must be last)
app.use(errorHandler);
```

## Error Types

### ValidationError

```typescript
import { ValidationError } from '@reacto-org/core';

throw new ValidationError({
  email: ['Email is required', 'Email must be valid'],
  username: ['Username too short'],
});
```

Response:
```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Email is required", "Email must be valid"],
    "username": ["Username too short"]
  }
}
```

### Custom Errors

```typescript
// In routes
app.get('/api/users/:id', async (req, res, next) => {
  try {
    const user = await ModelManager.objects(User).get({ id: parseInt(req.params.id) });
    res.json({ data: user.toJSON() });
  } catch (error) {
    next(error); // Pass to error handler
  }
});
```

## Error Responses

| Status | Description |
|---|---|
| 400 | Bad Request — invalid input |
| 401 | Unauthorized — not authenticated |
| 403 | Forbidden — insufficient permissions |
| 404 | Not Found — resource doesn't exist |
| 422 | Unprocessable Entity — validation failed |
| 500 | Internal Server Error — unexpected error |

## Development Mode

In development, errors include stack traces:

```json
{
  "error": "User not found",
  "stack": "Error: User not found\n    at ..."
}
```

In production, stack traces are hidden.

## SSR Error Pages

Custom error pages for server-rendered apps:

```typescript
// 404 page
app.use((req, res) => {
  res.status(404).type('html').send(`
    <html>
      <body>
        <h1>404 — Not Found</h1>
        <a href="/">Go home</a>
      </body>
    </html>
  `);
});
```
