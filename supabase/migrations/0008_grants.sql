-- 0008_grants.sql
-- Data API grants. authenticated only — anon gets nothing on these tables.
-- invitations: SELECT + INSERT only, status transitions go through the
-- SECURITY DEFINER functions in 0007.
-- media: SELECT + INSERT + DELETE only, no UPDATE — media rows are
-- immutable via the Data API once inserted.

grant usage on schema public to authenticated;

grant select, insert, update, delete
  on public.profiles, public.trips, public.trip_members, public.messages
  to authenticated;

grant select, insert
  on public.invitations
  to authenticated;

grant select, insert, delete
  on public.media
  to authenticated;

-- Explicit, not just "absence of grant" — makes the no-anon-access
-- decision visible and auditable in the migration history itself.
revoke all
  on public.profiles, public.trips, public.trip_members,
     public.invitations, public.media, public.messages
  from anon;