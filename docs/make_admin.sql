-- Make anushkachalkeofficial@gmail.com an admin
-- Run this in Supabase SQL Editor

update public.user_profiles
set role = 'admin'
where id = (
  select id from auth.users
  where email = 'anushkachalkeofficial@gmail.com'
);
