-- 0001_profiles.sql
-- Creates profiles table (1:1 with auth.users) and the trigger that
-- populates it automatically when a new Auth user signs up.

-- pgcrypto provides gen_random_uuid(); safe no-op if Supabase already enabled it.
create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'Application-level profile data, 1:1 with auth.users. Auth owns credentials; this owns display data only.';

-- Shared updated_at trigger function, reused by trips (0002) and any future table.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Auto-create a profile row whenever a new Auth user is created.
-- SECURITY DEFINER: this must write to public.profiles as a privileged role,
-- because the newly-created auth user has no rows/grants yet at signup time.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();