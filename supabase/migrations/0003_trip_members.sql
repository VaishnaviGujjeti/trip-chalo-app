-- 0003_trip_members.sql
-- Join table for trip access. Direct client INSERT is intentionally blocked
-- at the RLS layer (0007) — rows are only created by this trigger or
-- accept_invitation() (Phase 5, defined in 0007).

create table public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint trip_members_unique_membership unique (trip_id, user_id)
);

comment on table public.trip_members is
  'Membership + role per trip. Sole source of truth for "can this user see this trip". No direct client INSERT permitted — see RLS in 0007.';

create index trip_members_user_id_idx on public.trip_members (user_id);
create index trip_members_trip_id_user_id_idx on public.trip_members (trip_id, user_id);

-- Auto-add the trip creator as owner-member, atomically with trip creation.
create or replace function public.add_trip_owner_as_member()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.trip_members (trip_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_trip_created
  after insert on public.trips
  for each row
  execute function public.add_trip_owner_as_member();