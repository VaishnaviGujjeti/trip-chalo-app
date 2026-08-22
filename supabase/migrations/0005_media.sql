-- 0005_media.sql
-- Metadata and storage references only. Actual bytes live in Cloudflare R2
-- (Phase 6) — storage_key just reserves the pointer column now.

create table public.media (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  uploader_id uuid references public.profiles (id) on delete set null,
  storage_key text not null unique,
  media_type text not null check (media_type in ('photo', 'video')),
  original_filename text,
  mime_type text not null,
  file_size_bytes bigint not null check (file_size_bytes > 0),
  width integer,
  height integer,
  duration_seconds numeric,
  captured_at timestamptz,
  uploaded_at timestamptz not null default now(),
  processing_status text not null default 'pending'
    check (processing_status in ('pending', 'processing', 'ready', 'failed')),
  created_at timestamptz not null default now()
);

comment on table public.media is
  'Media metadata only — no file bytes stored here. captured_at (nullable, from EXIF/device) is kept separate from uploaded_at (always known) so the timeline can distinguish them without ever overwriting one with the other. No client UPDATE path — see RLS in 0007.';

create index media_trip_id_captured_at_idx on public.media (trip_id, captured_at);
create index media_uploader_id_idx on public.media (uploader_id);