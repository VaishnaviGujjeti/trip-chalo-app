-- 0006_messages.sql
-- Storage foundation for trip chat. No realtime/UI wiring in this phase.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  sender_id uuid references public.profiles (id) on delete set null,
  content text not null check (char_length(content) > 0),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);

comment on table public.messages is
  'Trip chat messages. sender_id is ON DELETE SET NULL so chat history survives a departed member''s account deletion.';

create index messages_trip_id_created_at_idx on public.messages (trip_id, created_at);