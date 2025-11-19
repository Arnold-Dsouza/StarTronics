-- Add admin_notes, technician_notes and assigned_technician_id columns to repair_requests
alter table public.repair_requests
  add column if not exists admin_notes text;

alter table public.repair_requests
  add column if not exists technician_notes text;

alter table public.repair_requests
  add column if not exists assigned_technician_id uuid references auth.users(id) on delete set null;

-- Admin can view all repair requests
drop policy if exists "Admin read all repair requests" on public.repair_requests;
create policy "Admin read all repair requests"
  on public.repair_requests for select
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Admin can update any repair request (for approval/rejection)
drop policy if exists "Admin update all repair requests" on public.repair_requests;
create policy "Admin update all repair requests"
  on public.repair_requests for update
  using (
    exists (
      select 1 from public.user_profiles
      where user_profiles.id = auth.uid()
      and user_profiles.role = 'admin'
    )
  );

-- Technicians can read their assigned repair requests
drop policy if exists "Technicians read assigned requests" on public.repair_requests;
create policy "Technicians read assigned requests"
  on public.repair_requests for select
  using (assigned_technician_id = auth.uid());

-- Technicians can update their assigned repair requests (for acceptance/rejection)
drop policy if exists "Technicians update assigned requests" on public.repair_requests;
create policy "Technicians update assigned requests"
  on public.repair_requests for update
  using (assigned_technician_id = auth.uid());
