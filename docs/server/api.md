# Auto-Generated API

Reacto automatically generates REST endpoints for all registered models.

## Endpoints

For each model, Reacto creates:

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/{table}` | List with pagination, filtering, ordering |
| `POST` | `/api/{table}` | Create |
| `GET` | `/api/{table}/:id` | Retrieve by ID |
| `PUT` | `/api/{table}/:id` | Full update |
| `PATCH` | `/api/{table}/:id` | Partial update |
| `DELETE` | `/api/{table}/:id` | Delete |
| `GET` | `/api/{table}/count` | Count |
| `POST` | `/api/{table}/bulk` | Bulk create |

## List Endpoint

```bash
GET /api/users?page=1&pageSize=20&orderBy=-createdAt&isActive=true
```

**Query Parameters:**

| Param | Description |
|---|---|
| `page` | Page number (default: 1) |
| `pageSize` | Items per page (default: 20, max: 100) |
| `orderBy` | Field to sort by (prefix `-` for desc) |
| `{field}` | Filter by field value |
| `with` | Eager load relations (comma-separated) |

**Response:**

```json
{
  "data": [
    { "id": 1, "username": "john", "email": "john@example.com" }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

## Create Endpoint

```bash
POST /api/users
Content-Type: application/json

{
  "username": "john",
  "email": "john@example.com",
  "password": "secret"
}
```

## Update Endpoint

```bash
PUT /api/users/1
Content-Type: application/json

{
  "username": "jane"
}
```

## Filtering

```bash
# Exact match
GET /api/users?isActive=true&role=admin

# Eager loading
GET /api/posts?with=author,comments

# Ordering
GET /api/posts?orderBy=-createdAt,title
```

## Nested Routes

Access related data:

```bash
GET /api/users/1/posts
GET /api/posts/1/comments
```

## Error Responses

```json
{
  "error": "Validation failed",
  "details": {
    "email": ["Email is required"],
    "username": ["Username too short"]
  }
}
```
