# Architecture Overview (MVP)

## Goals

- Fast iteration on repair request, quotation, payment, consultation flows.
- Shared TypeScript types between backend & frontend.
- Secure auth & data handling (JWT, minimal stored sensitive data).

## High-Level Components

| Component    | Tech                 | Purpose |
|--------------|---------------------|---------|
| Backend API  | Fastify (TypeScript) | REST endpoints, auth, business logic |
| Web Frontend | Next.js (React)      | Customer & admin UI |
| Shared Types | TypeScript modules   | Domain model contracts |
| Database     | PostgreSQL           | Persistent relational data |
| Payments     | Stripe (planned)     | Quote payment capture |
| Realtime     | WebSocket (planned)  | Chat consultation |

## Domain Flow (Simplified)

```text
User -> Create RepairRequest -> Technician reviews -> Generates Quote -> User accepts & pays -> Work progresses -> Completion
```

## Authentication (Planned)

- Register/Login with email + password (hashed using Argon2 or bcrypt). Argon2 preferred.
- Issue short-lived access JWT + long-lived refresh token (HTTP-only cookie on web; secure storage on mobile).
- Role-based access control (customer / technician / admin) enforced in handlers.

## Authorization Strategy

- Middleware extracts user & role from access token.
- Resource ownership checks (e.g., a customer can only view their own repair requests; technicians only those assigned or new).
- Admin overrides for management views.

## Initial Endpoint Sketch

| Method | Path | Description |
|--------|------|-------------|
| POST | /auth/register | Create account |
| POST | /auth/login | Authenticate & receive tokens |
| POST | /auth/refresh | Refresh access token |
| POST | /repairs | Submit repair request |
| GET  | /repairs | List requests (filtered by role) |
| GET  | /repairs/:id | View request details |
| POST | /quotes | Create quote for request |
| GET  | /quotes/:id | View quote |
| POST | /quotes/:id/accept | Accept quote & trigger payment intent |
| POST | /payments/webhook | Stripe webhook handler |
| GET  | /health | Service health check |

(Additional endpoints: devices CRUD, messages, conversations.)

## Data Model (Early Draft)

```text
users (id, role, name, email, password_hash, created_at, updated_at)
devices (id, user_id, type, brand, model, serial_encrypted, created_at)
repair_requests (id, user_id, device_id, issue_description, urgency, status, created_at, updated_at)
quotes (id, repair_request_id, technician_id, parts_cost, labor_cost, total, currency, notes, status, expires_at, created_at)
payments (id, user_id, quote_id, amount, currency, provider, provider_ref, status, captured_at, created_at)
conversations (id, repair_request_id, channel_type, created_at, last_message_at)
messages (id, conversation_id, sender_id, content, type, sent_at)
```

## Error Handling

- Central error handler mapping domain errors to HTTP codes.
- Validation errors (400), auth failures (401), permission denied (403), not found (404), conflict (409), rate limit (429), server (500).

## Logging & Monitoring (Planned)

- Fastify built-in logger (Pino) with structured JSON.
- Request ID middleware for trace correlation.
- Future: OpenTelemetry for tracing.

## Security Considerations

- HTTPS enforced at deployment layer.
- JWT secrets rotated (manual for MVP).
- Input validation via Zod schemas.
- Rate limiting per IP/user for auth + write-heavy endpoints.
- Encryption of sensitive serial numbers before storage.

## Scaling Path (Future)

- Extract chat service (WebSocket) into standalone instance if load increases.
- Add Redis for session invalidation & caching heavy reads.
- Introduce background job queue (BullMQ) for emails & webhook processing.
- Split read replica database for analytics.

## Frontend Notes

- Next.js pages for marketing + app routes (later transition to App Router possible).
- Protected routes gating by auth state; token refresh on navigation if near expiry.

## Payment Flow (Planned)

1. User accepts quote.
2. Backend creates Stripe PaymentIntent and returns client secret.
3. Frontend confirms payment using Stripe elements.
4. Webhook updates payment status & marks quote as "accepted" and repair_request as "approved".

## Chat Flow (Planned)

- Initiate conversation linked to repair_request.
- WebSocket channel per conversation ID.
- Persist messages to DB; deliver in real-time.
- Upgrade path: video via external provider (Twilio/Daily) with session tokens.

## Tech Debt / TODO

- Choose migration tool (Prisma recommended for speed & type safety).
- Implement refresh token revocation list.
- Add automated tests baseline.

Document version: 0.1
