# Development Setup

This guide helps you run the StarTronics backend (Fastify API) and frontend (Next.js) locally on Windows.

## Prerequisites

- Node.js (>= 18 LTS) [Download](https://nodejs.org/)
- Docker Desktop (for PostgreSQL) [Download](https://www.docker.com/products/docker-desktop)

Optional (later):

- Git (version control)
- Stripe account (test keys)

## First-Time Install

Open a terminal (`cmd.exe`) in the project root:

```cmd
cd backend
npm install
cd ..\frontend
npm install
```

## Environment Variables

Backend:

1. Copy `backend/.env.example` to `backend/.env`.
2. Replace `JWT_SECRET` with a long random string (at least 32 characters).

Frontend:

1. Copy `frontend/.env.example` to `frontend/.env.local` (only needed if you change defaults).
2. `NEXT_PUBLIC_API_BASE` should point to the backend (`http://localhost:4000`).

## Starting Services

Start PostgreSQL container (first time creates a volume):

```cmd
docker compose up -d
```

Run backend (in a new terminal):

```cmd
cd backend
npm run dev
```

Run frontend (in another terminal):

```cmd
cd frontend
npm run dev
```

Access frontend at: <http://localhost:3000>
Health check backend at: <http://localhost:4000/health>

## Future Tooling (Planned)

- Database migrations: Prisma or Knex
- ESLint + Prettier (code consistency)
- Testing: Vitest / Jest
- Logger: Pino (already via Fastify logger)

## Common Issues

- Port conflicts: Change `PORT` in `backend/.env` if 4000 in use.
- Docker not starting: Ensure virtualization is enabled and Docker Desktop running.
- Missing `JWT_SECRET`: Server will fail early if not set or too short.

## Next Implementation Steps

1. Auth routes (register, login, token refresh)
2. Database schema & migrations (users, devices, repair_requests, quotes, payments)
3. Repair request CRUD endpoints
4. Quote creation & acceptance flow
5. Stripe test integration
6. Basic chat (WebSocket) scaffold
7. Admin role-based access controls

## Cleanup / Teardown

```cmd
docker compose down
```

To remove database volume completely (WARNING: deletes data):

```cmd
docker compose down -v
```

## Suggested Directory Conventions

Backend modules (planned): `auth/`, `users/`, `repairs/`, `quotes/`, `payments/`, `chat/`
Shared types live in `shared/types/`.

---

Document version: 0.2
