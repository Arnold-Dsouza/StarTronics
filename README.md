# StarTronics

Electronics repair & consultation platform (MVP).

## Vision

Enable customers to submit repair requests for any electronic gadget, receive quotations from technicians, consult via chat (video later), and pay securely. Admin/technician users manage quotes, work orders, and overall operations.

## Stack

- Frontend Web: React + Vite + Tailwind CSS (SPA)
- Backend (optional for now): Node.js + TypeScript + Fastify (only needed for advanced server logic)
- Database/Auth/Storage: Supabase (PostgreSQL + RLS + Auth)
- Payments: Stripe (planned)
- Validation: Zod schemas
- Realtime (planned): Supabase Realtime / WebSockets (chat)

## Core Domain Entities (MVP)

User, Device, RepairRequest, Quote, Payment, Conversation, Message, TechnicianProfile.

## Initial Features

1. User registration & login
2. Submit repair request with device details
3. Technician creates/sends quote
4. Customer accepts and pays (Stripe test mode)
5. Basic consultation chat
6. Admin dashboard (list & manage requests/quotes/users)

## Repository Structure

- `backend/` - Fastify API server (optional; not required for core flows)
- `frontend/` - React + Vite web app
- `shared/` - Shared TypeScript types & validation schemas
- `docs/` - Architecture & Supabase setup docs
- `docker-compose.yml` - Dev services (optional)

## Environment Variables

- Frontend: `frontend/.env.local` requires `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Backend (optional): see `backend/.env.example` if you run the server.

## Development (Targets)

- Frontend only (recommended):
   - `cd frontend && npm run dev`
   - App talks directly to Supabase; no backend needed.
- Backend (optional):
   - `cd backend && npm run dev`

## Roadmap (High-Level)

- Phase 1: Auth + Repair Requests
- Phase 2: Quotes + Payments
- Phase 3: Chat + Admin Dashboard
- Phase 4: Technician profiles + Ratings
- Phase 5: Video consultation + Inventory management

## License

Internal / Proprietary (set actual license later).
