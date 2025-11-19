-- Ensure the assignment column exists
alter table public.repair_requests
  add column if not exists assigned_technician_id uuid references auth.users(id) on delete set null;

-- Helpful index
create index if not exists idx_repair_requests_assigned_technician
  on public.repair_requests(assigned_technician_id);

-- Technician: read assigned requests
drop policy if exists "Technicians read assigned requests" on public.repair_requests;
create policy "Technicians read assigned requests"
  on public.repair_requests for select
  using (assigned_technician_id = auth.uid());

-- Technician: update assigned requests
drop policy if exists "Technicians update assigned requests" on public.repair_requests;
create policy "Technicians update assigned requests"
  on public.repair_requests for update
  using (assigned_technician_id = auth.uid());

-- Technician: view unassigned pending requests to claim
drop policy if exists "Technicians view unassigned pending" on public.repair_requests;
create policy "Technicians view unassigned pending"
  on public.repair_requests for select
  using (
    status = 'pending'
    and assigned_technician_id is null
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'technician'
    )
  );

-- Technician: claim a pending request by assigning self
drop policy if exists "Technicians claim pending" on public.repair_requests;
create policy "Technicians claim pending"
  on public.repair_requests for update
  using (
    status = 'pending'
    and assigned_technician_id is null
    and exists (
      select 1 from public.user_profiles up
      where up.id = auth.uid() and up.role = 'technician'
    )
  )
  with check (assigned_technician_id = auth.uid());