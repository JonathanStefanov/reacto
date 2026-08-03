# Deploy to Render

One-click deployment with `render.yaml`.

## Quick Deploy

1. Push repo to GitHub
2. Go to [render.com](https://render.com) → **New** → **Blueprint**
3. Connect repo → Render detects `render.yaml`
4. Click **Apply**

## render.yaml

```yaml
services:
  - type: web
    name: my-app
    runtime: node
    plan: free
    buildCommand: npm install
    startCommand: npx tsx server.ts
    envVars:
      - key: DB_HOST
        fromDatabase:
          name: my-db
          property: host
      - key: DB_PORT
        fromDatabase:
          name: my-db
          property: port
      - key: DB_NAME
        fromDatabase:
          name: my-db
          property: database
      - key: DB_USER
        fromDatabase:
          name: my-db
          property: user
      - key: DB_PASSWORD
        fromDatabase:
          name: my-db
          property: password
      - key: SESSION_SECRET
        generateValue: true
      - key: NODE_ENV
        value: production

databases:
  - name: my-db
    plan: free
    databaseName: myapp
    postgresMajorVersion: "16"
```

## Manual Setup

1. **New Web Service** → connect repo
2. **Build Command:** `npm install`
3. **Start Command:** `npx tsx server.ts`
4. **Add PostgreSQL** database (free tier)
5. **Environment Variables:**
   - `DB_HOST` — from database
   - `DB_PORT` — from database
   - `DB_NAME` — from database
   - `DB_USER` — from database
   - `DB_PASSWORD` — from database
   - `SESSION_SECRET` — generate random
   - `NODE_ENV` — `production`

## After Deploy

Seed the database:

```bash
# Option 1: Render Shell
npx tsx seed.ts

# Option 2: Local with remote DB
DB_HOST=your-render-db-host DB_NAME=movieapp npx tsx seed.ts
```

## Environment Variables

| Variable | Description |
|---|---|
| `DB_HOST` | Database host |
| `DB_PORT` | Database port |
| `DB_NAME` | Database name |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `SESSION_SECRET` | Session signing secret |
| `PORT` | Server port (default: 3000) |
| `NODE_ENV` | `production` or `development` |
