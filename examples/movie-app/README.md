# 🎬 CineLog — Movie Tracker & Chat

A full-stack movie tracking app built with **Reacto**. Track movies you've
watched, rate them, and chat with other users in real-time.

Built with Reacto's React frontend hooks, WebSocket real-time system,
auto-generated API, and admin dashboard.

## Features

This example demonstrates **every Reacto capability**:

| Feature | Where |
|---|---|
| **ORM + Relations** | `User`, `Movie`, `Review`, `ChatMessage` with FK relations |
| **Validators** | Email validation, rating range (1–10), content length |
| **Signals** | Auto-hash passwords on save, recalculate movie ratings |
| **JWT Auth** | Register, login, protected API routes |
| **WebSocket** | Real-time chat + live review notifications |
| **Auto-API** | REST endpoints auto-generated from models |
| **Full-text Search** | Search movies by title, director, description |
| **Caching** | Movie list cached with auto-invalidation |
| **Background Tasks** | Welcome email on registration, poster processing |
| **Admin Dashboard** | Auto-generated CRUD UI at `/admin` |
| **React Frontend** | Hooks-based React app with Vite |

## Prerequisites

- **Node.js** 20+
- **PostgreSQL** 14+

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/JonathanStefanov/reacto.git
cd reacto
npm install

# Install client dependencies
cd examples/movie-app/client
npm install
cd ../../..
```

### 2. Create the database

```bash
createdb movieapp
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

**Test accounts:**
- `cine@example.com` / `password123`
- `horror@example.com` / `password123`
- `drama@example.com` / `password123`
- `scifigeek@example.com` / `password123`

### 5. Build the React client

```bash
cd examples/movie-app/client
npm run build
cd ../../..
```

### 6. Start the server

```bash
npx tsx examples/movie-app/server.ts
```

### 7. Open the app

- **App:** http://localhost:3000
- **Admin:** http://localhost:3000/admin
- **API:** http://localhost:3000/api

## Development Mode

For development with hot-reload on the React client:

**Terminal 1 — API server:**
```bash
npx tsx examples/movie-app/server.ts
```

**Terminal 2 — Vite dev server:**
```bash
cd examples/movie-app/client
npm run dev
```

Then open http://localhost:5173 (Vite proxies API calls to port 3000).

## Project Structure

```
examples/movie-app/
├── server.ts              # Express server with all routes
├── models.ts              # ORM models (User, Movie, Review, ChatMessage)
├── seed.ts                # Database seed script
├── README.md              # This file
└── client/
    ├── package.json
    ├── vite.config.ts
    ├── index.html
    └── src/
        ├── main.tsx           # React entry point
        ├── App.tsx            # Main app component
        ├── styles.css         # Global styles
        ├── hooks/
        │   ├── useAuth.ts     # Auth state + login/register/logout
        │   └── useChat.ts     # WebSocket chat hook
        └── components/
            ├── Header.tsx     # Navigation bar
            ├── AuthForm.tsx   # Login / Register form
            ├── MovieGrid.tsx  # Movie list with search & filters
            ├── MovieDetail.tsx # Movie detail + reviews
            ├── WatchedList.tsx # User's watched movies
            ├── ChatPanel.tsx   # Real-time chat sidebar
            └── Notification.tsx # Toast notifications
```

## API Endpoints

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current user (🔒) |

### Movies
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies` | List movies (search, filter, paginate, cache) |
| `GET` | `/api/movies/:id` | Movie detail with reviews |
| `POST` | `/api/movies` | Add movie (🔒) |
| `PUT` | `/api/movies/:id` | Update movie (🔒) |
| `DELETE` | `/api/movies/:id` | Delete movie (🔒) |

### Reviews
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/movies/:id/reviews` | List reviews for a movie |
| `POST` | `/api/movies/:id/reviews` | Add review (🔒) |

### User
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users/me/watched` | Get user's watched list (🔒) |

### Admin & Monitoring
| Method | Path | Description |
|---|---|---|
| `GET` | `/admin` | Admin dashboard UI |
| `GET` | `/api/_admin/meta` | Model metadata |
| `GET` | `/api/_admin/tasks` | Background task status |

### WebSocket (`ws://localhost:3000/ws`)
- Real-time chat messages
- Live review notifications
- Chat history on connect

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

## Learn More

- [Reacto on GitHub](https://github.com/JonathanStefanov/reacto)
- [@reacto-org/core on npm](https://www.npmjs.com/package/@reacto-org/core)
- [@reacto-org/server on npm](https://www.npmjs.com/package/@reacto-org/server)
