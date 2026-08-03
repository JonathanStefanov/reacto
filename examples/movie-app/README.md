# 🎬 CineLog — Movie Tracker & Chat

A full-featured movie tracking app built with **Reacto**. Track movies you've
watched, rate them, and chat with other users in real-time.

## Features

This example demonstrates **every Reacto capability**:

| Feature | Where |
|---|---|
| **ORM + Models** | `User`, `Movie`, `Review`, `ChatMessage` with relations |
| **Validators** | Email validation, rating range (1–10), content length |
| **Signals** | Auto-hash passwords on save, recalculate movie ratings |
| **JWT Auth** | Register, login, protected routes |
| **WebSocket** | Real-time chat + live review notifications |
| **File Uploads** | Movie poster upload support |
| **Full-text Search** | Search movies by title, director, description |
| **Caching** | Movie list cached for 60s with auto-invalidation |
| **Background Tasks** | Welcome email on registration, poster processing |
| **Admin Dashboard** | Auto-generated CRUD UI at `/admin` |

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+ (local or remote)

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto
npm install
```

### 2. Create the database

```bash
createdb movieapp
```

Or with psql:

```sql
CREATE DATABASE movieapp;
```

### 3. Configure environment

Create a `.env` file in the project root:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=movieapp
DB_USER=postgres
DB_PASSWORD=postgres
PORT=3000
```

### 4. Run migrations & seed data

```bash
npx reacto migrate
npx tsx examples/movie-app/seed.ts
```

This creates 4 test users, 10 movies, 15 reviews, and 7 chat messages.

Test accounts:
- `cine@example.com` / `password123`
- `horror@example.com` / `password123`
- `drama@example.com` / `password123`
- `scifigeek@example.com` / `password123`

### 5. Start the server

```bash
npx tsx examples/movie-app/server.ts
```

### 6. Open the app

- **App:** http://localhost:3000
- **Admin:** http://localhost:3000/admin
- **API:** http://localhost:3000/api

## Project Structure

```
examples/movie-app/
├── server.ts          # Server setup with all routes
├── models.ts          # ORM models (User, Movie, Review, ChatMessage)
├── client/
│   └── index.html     # Single-page frontend (vanilla JS, no build step)
└── README.md          # This file
```

## API Endpoints

### Auth

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current user (protected) |

### Movies

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies (search, filter, paginate) |
| `GET` | `/api/movies/:id` | Movie detail with reviews |
| `POST` | `/api/movies` | Add movie (protected) |
| `PUT` | `/api/movies/:id` | Update movie (protected) |
| `DELETE` | `/api/movies/:id` | Delete movie (protected) |

### Reviews

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies/:id/reviews` | List reviews for a movie |
| `POST` | `/api/movies/:id/reviews` | Add review (protected) |

### User

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/me/watched` | Get user's watched list (protected) |

### Admin

| Method | Path | Description |
|---|---|---|
| `GET` | `/admin` | Admin dashboard UI |
| `GET` | `/api/_admin/meta` | Model metadata |
| `GET` | `/api/_admin/tasks` | Background task status |

### WebSocket

Connect to `ws://localhost:3000/ws` for:

- **Real-time chat** — send/receive messages
- **Live reviews** — get notified when someone reviews a movie
- **Chat history** — sent on connect

## Models

### User
- `username`, `email`, `password` (auto-hashed via signal), `bio`, `avatarUrl`
- Has many: `reviews`, `messages`

### Movie
- `title`, `description`, `director`, `year`, `genre`, `posterUrl`
- `averageRating` (auto-calculated via signal), `reviewCount`
- Has many: `reviews`

### Review
- `movieId` (FK → Movie), `userId` (FK → User), `rating` (1–10), `comment`, `watchedAt`
- Belongs to: `movie`, `user`

### ChatMessage
- `userId` (FK → User), `content`, `channel`
- Belongs to: `user`

## Example Usage

### Register & add a movie

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"filmfan","email":"fan@example.com","password":"secret123"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"fan@example.com","password":"secret123"}'

# Add a movie (use the token from login)
curl -X POST http://localhost:3000/api/movies \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"title":"Inception","description":"A mind-bending thriller","director":"Christopher Nolan","year":2010,"genre":"Sci-Fi"}'

# Rate it
curl -X POST http://localhost:3000/api/movies/1/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"rating":9,"comment":"Absolutely incredible visuals and story"}'

# Search movies
curl "http://localhost:3000/api/movies?search=inception"
```

## Learn More

- [Reacto Documentation](https://github.com/JonathanStefanov/reacto)
- [npm: @reacto-org/core](https://www.npmjs.com/package/@reacto-org/core)
- [npm: @reacto-org/server](https://www.npmjs.com/package/@reacto-org/server)
