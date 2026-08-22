-- 0002_trips.sql
-- Creates the trips table. Private by default — no public discovery column exists.

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles (id),
  name text not null,
  description text,
  start_date date,
  end_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_end_after_start check (end_date is null or start_date is null or end_date >= start_date)
);

comment on table public.trips is
  'A private shared travel experience. owner_id is denormalized for cheap RLS checks; also mirrored into trip_members via trigger in 0003.';

create index trips_owner_id_idx on public.trips (owner_id);

create trigger trips_set_updated_at
  before update on public.trips
  for each row
  execute function public.set_updated_at();