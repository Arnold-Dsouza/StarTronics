# Supabase Setup

This guide connects the StarTronics backend to Supabase (hosted Postgres + Auth + Storage).

## 1. Create Project

1. Sign up / log in at <https://supabase.com>
2. Create a new project (choose strong password). Note your `Project URL` and `Anon` and `Service Role` keys under Project Settings > API.

## 2. Environment Variables

Copy `.env.example` to `.env` in `backend/` and fill:

```env
PORT=4000
JWT_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
```

Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend.

## 3. Apply Schema

Open Supabase dashboard > SQL Editor. Paste contents of `backend/supabase/schema.sql` and run. Rerun safely—`if not exists` guards are present.

## 4. Auth Strategy

Supabase manages core user auth (signup/login/password reset). We store extended profile data in `public.user_profiles` keyed by `auth.users(id)`.

Later we can:

- Use Supabase OAuth providers
- Issue our own JWTs wrapping Supabase session if required for custom claims

## 5. Row Level Security (RLS)

RLS is enabled with initial policies. Review and refine once features expand:

- Customers: can manage own devices, repair requests
- Technicians: can create quotes and view associated repair requests
- Messages: visible to repair request participants (customer + assigned technician)

## 6. Local Development Options

- Use Supabase hosted (recommended for simplicity)
- Or run local via `supabase cli` (optional). Not required now.

## 7. Backend Usage

`src/supabase.ts` creates a service role client for privileged server actions (e.g., counting records). For request-scoped operations tied to a user session we will later create an anon client with the user's JWT.

Example quick query (already used in `/db/health`):

```ts
const { data, error } = await supabase.from('repair_requests').select('*');
```

## 8. Next Steps

1. Implement endpoints using Supabase (e.g., POST /repair-requests)
2. Integrate Supabase auth on frontend for signup/login
3. Add storage bucket for device issue images
4. Add RPC or triggers for advanced logic (e.g., quote auto-expiry)

## 9. Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| 401 errors | Wrong key | Verify keys in `.env` |
| Empty counts | Table name mismatch | Re-run schema SQL |
| Policy denied | RLS blocking | Temporarily create permissive policy, then refine |

## 10. Security Checklist

- Keep service role key only in backend `.env`
- Rotate keys if leaked
- Restrict policies early; avoid broad `for all using (true)`
- Log suspicious access attempts

---
Update this doc as DB evolves.
