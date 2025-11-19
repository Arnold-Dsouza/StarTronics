-- StarTronics Complete Schema
-- Run this ENTIRE file in the Supabase SQL editor

-- Enable UUIDs
create extension if not exists "uuid-ossp";

-- Drop existing policies to start fresh
drop policy if exists "Users can view own profile" on public.user_profiles;
drop policy if exists "Users can update own profile" on public.user_profiles;
drop policy if exists "Insert own profile" on public.user_profiles;
drop policy if exists "Users can create own profile" on public.user_profiles;
drop policy if exists "Enable insert for authenticated users" on public.user_profiles;
drop policy if exists "Users read own devices" on public.devices;
drop policy if exists "Users insert own devices" on public.devices;
drop policy if exists "Users update own devices" on public.devices;
drop policy if exists "Users delete own devices" on public.devices;
drop policy if exists "Users read own repair requests" on public.repair_requests;
drop policy if exists "Users create repair requests" on public.repair_requests;
drop policy if exists "Users update own repair requests" on public.repair_requests;
drop policy if exists "Users delete own repair requests" on public.repair_requests;
drop policy if exists "Admin read all repair requests" on public.repair_requests;
drop policy if exists "Admin update all repair requests" on public.repair_requests;
drop policy if exists "Technicians read assigned requests" on public.repair_requests;
drop policy if exists "Technicians update assigned requests" on public.repair_requests;

-- Tables
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text not null default 'customer',
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.devices (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  brand text,
  model text,
  serial_number text,
  created_at timestamptz default now()
);

create table if not exists public.repair_requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.devices(id) on delete cascade,
  title text not null,
  description text,
  -- Status lifecycle: pending | accepted | in_progress | completed | cancelled | technician_rejected
  status text not null default 'pending',
  urgency text default 'normal',
  images jsonb,
  admin_notes text,
  technician_notes text,
  assigned_technician_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Quotes (billing) - multi-item INR breakdown
create table if not exists public.quotes (
  id uuid primary key default uuid_generate_v4(),
  repair_request_id uuid not null references public.repair_requests(id) on delete cascade,
  technician_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  -- breakdown JSON structure example:
  -- {
  --   "items": [ { "description": "Screen replacement", "amount": 4999.00 }, ...],
  --   "notes": "Customer discount applied"
  -- }
  breakdown jsonb,
  status text not null default 'sent', -- sent | accepted | declined | expired
  created_at timestamptz default now()
);

-- Payments (simple demo, real integration would use Stripe)
create table if not exists public.payments (
  id uuid primary key default uuid_generate_v4(),
  quote_id uuid not null references public.quotes(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  amount numeric(10,2) not null,
  currency text not null default 'INR',
  status text not null default 'succeeded', -- initiated | succeeded | failed | refunded
  stripe_payment_intent text,
  created_at timestamptz default now()
);

-- Saved Cards (tokenized, secure storage - in production use Stripe tokens)
create table if not exists public.saved_cards (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_last4 text not null,
  card_brand text not null, -- visa, mastercard, amex, etc.
  card_holder_name text not null,
  expiry_month text not null,
  expiry_year text not null,
  is_default boolean default false,
  -- In production, store tokenized card reference (e.g., Stripe card token)
  -- NEVER store full card numbers or CVV
  stripe_card_token text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.user_profiles enable row level security;
alter table public.devices enable row level security;
alter table public.repair_requests enable row level security;
alter table public.quotes enable row level security;
alter table public.payments enable row level security;
alter table public.saved_cards enable row level security;

-- Safety: drop any existing RLS policies on key tables to avoid conflicts/recursion
do $$
declare r record;
begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='repair_requests' loop
    execute format('drop policy if exists %I on public.repair_requests', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='quotes' loop
    execute format('drop policy if exists %I on public.quotes', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='messages' loop
    execute format('drop policy if exists %I on public.messages', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='devices' loop
    execute format('drop policy if exists %I on public.devices', r.policyname);
  end loop;
  for r in select policyname from pg_policies where schemaname='public' and tablename='user_profiles' loop
    execute format('drop policy if exists %I on public.user_profiles', r.policyname);
  end loop;
end $$;

-- User Profiles Policies
create policy "Users can view own profile"
  on public.user_profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.user_profiles for update
  using (auth.uid() = id);

create policy "Enable insert for authenticated users"
  on public.user_profiles for insert
  to authenticated
  with check (true);

-- Devices Policies
create policy "Users read own devices"
  on public.devices for select
  using (auth.uid() = user_id);

create policy "Users insert own devices"
  on public.devices for insert
  with check (auth.uid() = user_id);

create policy "Users update own devices"
  on public.devices for update
  using (auth.uid() = user_id);

create policy "Users delete own devices"
  on public.devices for delete
  using (auth.uid() = user_id);

-- Repair Requests Policies (Customer)
create policy "Users read own repair requests"
  on public.repair_requests for select
  using (auth.uid() = user_id);

create policy "Users create repair requests"
  on public.repair_requests for insert
  with check (auth.uid() = user_id);

create policy "Users update own repair requests"
  on public.repair_requests for update
  using (auth.uid() = user_id);

create policy "Users delete own repair requests"
  on public.repair_requests for delete
  using (auth.uid() = user_id);

-- Repair Requests Policies (Admin)
create policy "Admin read all repair requests"
  on public.repair_requests for select
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

create policy "Admin update all repair requests"
  on public.repair_requests for update
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Repair Requests Policies (Technician)
create policy "Technicians read assigned requests"
  on public.repair_requests for select
  using (assigned_technician_id = auth.uid());

create policy "Technicians update assigned requests"
  on public.repair_requests for update
  using (assigned_technician_id = auth.uid());

-- Allow technicians to view unassigned pending requests (so they can claim)
create policy "Technicians view unassigned pending"
  on public.repair_requests for select
  using (
    status = 'pending' and assigned_technician_id is null and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'technician'
    )
  );

-- Allow technicians to claim unassigned pending requests by setting themselves as assignee
create policy "Technicians claim pending"
  on public.repair_requests for update
  using (
    status = 'pending' and assigned_technician_id is null and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'technician'
    )
  )
  with check (assigned_technician_id = auth.uid());

-- Payments & Quotes additional policies
drop policy if exists "Users create own payments" on public.payments;
create policy "Users create own payments" on public.payments for insert with check ( auth.uid() = user_id );

drop policy if exists "Users accept quotes" on public.quotes;
create policy "Users accept quotes" on public.quotes for update using (
  exists (select 1 from public.repair_requests r where r.id = quotes.repair_request_id and r.user_id = auth.uid())
) with check ( status in ('accepted','declined','sent','pending') );

-- Quote read policies (customer & assigned technician)
drop policy if exists "Users read quotes for their requests" on public.quotes;
create policy "Users read quotes for their requests" on public.quotes for select using (
  exists (
    select 1 from public.repair_requests r
    where r.id = quotes.repair_request_id and r.user_id = auth.uid()
  ) or technician_id = auth.uid()
);

-- Technicians create quotes only for requests they are assigned to
drop policy if exists "Technicians create quotes" on public.quotes;
create policy "Technicians create quotes" on public.quotes for insert with check (
  technician_id = auth.uid() and exists (
    select 1 from public.repair_requests r
    where r.id = quotes.repair_request_id and r.assigned_technician_id = auth.uid()
  )
);

-- Technicians edit their own pending quotes (allow item & amount adjustments before payment)
drop policy if exists "Technicians edit pending quotes" on public.quotes;
create policy "Technicians edit pending quotes" on public.quotes for update using (
  technician_id = auth.uid() and status = 'sent'
) with check (
  technician_id = auth.uid() and status = 'sent'
);

-- Payments select policy (only payer/customer can see their payment rows)
drop policy if exists "Users read own payments" on public.payments;
create policy "Users read own payments" on public.payments for select using ( auth.uid() = user_id );

-- Saved Cards Policies
drop policy if exists "Users read own saved cards" on public.saved_cards;
create policy "Users read own saved cards" on public.saved_cards for select using ( auth.uid() = user_id );

-- Success Stories (testimonials)
create table if not exists public.success_stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  quote_id uuid not null references public.quotes(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  story text not null,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.success_stories enable row level security;

-- Allow public to read only 5-star stories (featured)
drop policy if exists "Public read featured stories" on public.success_stories;
create policy "Public read featured stories" on public.success_stories for select using (
  rating = 5
);

-- Users can read their own stories regardless of rating
drop policy if exists "Users read own stories" on public.success_stories;
create policy "Users read own stories" on public.success_stories for select using (
  user_id = auth.uid()
);

-- Users can create a story only if they paid for the quote (payment succeeded)
drop policy if exists "Users create story after payment" on public.success_stories;
create policy "Users create story after payment" on public.success_stories for insert with check (
  user_id = auth.uid() and exists (
    select 1 from public.payments p where p.quote_id = success_stories.quote_id and p.user_id = auth.uid() and p.status = 'succeeded'
  )
);

-- Users can update their own stories (e.g., fix typos) but not change ownership
drop policy if exists "Users update own stories" on public.success_stories;
create policy "Users update own stories" on public.success_stories for update using (
  user_id = auth.uid()
) with check (
  user_id = auth.uid() and rating between 1 and 5
);

drop policy if exists "Users insert own saved cards" on public.saved_cards;
create policy "Users insert own saved cards" on public.saved_cards for insert with check ( auth.uid() = user_id );

drop policy if exists "Users update own saved cards" on public.saved_cards;
create policy "Users update own saved cards" on public.saved_cards for update using ( auth.uid() = user_id );

drop policy if exists "Users delete own saved cards" on public.saved_cards;
create policy "Users delete own saved cards" on public.saved_cards for delete using ( auth.uid() = user_id );

-- Triggers for updated_at
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_user_profiles_updated_at on public.user_profiles;
create trigger set_user_profiles_updated_at
  before update on public.user_profiles
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_repair_requests_updated_at on public.repair_requests;
create trigger set_repair_requests_updated_at
  before update on public.repair_requests
  for each row execute procedure public.set_updated_at();

-- Indexes
create index if not exists idx_repair_requests_user_id on public.repair_requests(user_id);
create index if not exists idx_repair_requests_assigned_technician on public.repair_requests(assigned_technician_id);
create index if not exists idx_quotes_repair_request_id on public.quotes(repair_request_id);
create index if not exists idx_quotes_technician_id on public.quotes(technician_id);
create index if not exists idx_payments_quote_id on public.payments(quote_id);
create index if not exists idx_saved_cards_user_id on public.saved_cards(user_id);

-- Set admin role (update email as needed)
update public.user_profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'anushkachalkeofficial@gmail.com'
);

-- Auto-create a profile row whenever a new auth user is created
create or replace function public.handle_auth_user_created() returns trigger as $$
begin
  insert into public.user_profiles (id, display_name, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(nullif(new.raw_user_meta_data->>'role', ''), 'customer'),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_created();

-- Backfill profiles for any existing auth users who don't have one yet
insert into public.user_profiles (id, display_name, role, avatar_url)
select u.id,
       coalesce(u.raw_user_meta_data->>'full_name', u.email),
       'customer',
       u.raw_user_meta_data->>'avatar_url'
from auth.users u
left join public.user_profiles p on p.id = u.id
where p.id is null;

-- Ensure admin role after backfill (update email as needed)
update public.user_profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'anushkachalkeofficial@gmail.com'
);
