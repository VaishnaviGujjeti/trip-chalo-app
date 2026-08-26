-- 0009_trips_select_owner.sql
-- Fixes a design defect in 0007: the trips SELECT policy made it impossible
-- for a trip's creator to read back the row they had just inserted, so trip
-- creation failed at runtime with PostgreSQL 42501,
-- 'new row violates row-level security policy for table "trips"'.
--
-- WHY THE OLD POLICY COULD NEVER PASS
--
-- PostgreSQL applies a table's SELECT policies to the *new* row whenever a
-- data-modifying statement has a RETURNING clause that reads the relation's
-- columns, and raises an error rather than silently skipping the row:
--
--   "If a data-modifying query has a RETURNING clause, SELECT permissions
--    are required on the relation, and any newly inserted or updated rows
--    from the relation must satisfy the relation's SELECT policies in order
--    to be available to the RETURNING clause. If a newly inserted or updated
--    row does not satisfy the relation's SELECT policies, an error will be
--    thrown (inserted or updated rows to be returned are never silently
--    ignored)."
--                       -- PostgreSQL docs, CREATE POLICY (see also fn. [a]
--                          of "Policies Applied by Command Type")
--
-- supabase-js turns `.insert(...).select(...)` into `Prefer:
-- return=representation`, which is exactly that case: INSERT ... RETURNING id.
--
-- The old policy's only condition was is_trip_member(id). But the owner's
-- trip_members row is created by on_trip_created (0003), an AFTER INSERT
-- trigger whose own foreign key requires the trips row to already exist.
-- The new-row SELECT check therefore always runs *before* that membership row
-- can exist, so is_trip_member(new.id) was necessarily false and every
-- creator's INSERT ... RETURNING aborted.
--
-- WHY THE FIX GRANTS NO ADDITIONAL VISIBILITY
--
-- Adding `owner_id = auth.uid()` is provably not a widening of access on
-- committed rows, because a trip's owner is always a member of that trip:
--
--   * on_trip_created (0003) inserts the owner's ('owner') trip_members row
--     atomically with every trips insert, and is unconditional;
--   * trip_members_delete_self_or_owner (0007) makes the owner's own row
--     undeletable -- it matches neither disjunct of that policy;
--   * trips_update_owner (0007) has WITH CHECK (owner_id = auth.uid()), so
--     owner_id can never be reassigned to a different user.
--
-- So owner_id = auth.uid() implies is_trip_member(id) for every committed
-- row. The new disjunct only makes the row visible *during* the INSERT
-- statement that creates it -- precisely the case that was broken.
--
-- It is also cheaper: owner_id is the denormalized column 0002 added "for
-- cheap RLS checks" and is indexed (trips_owner_id_idx), so the common
-- own-trip case short-circuits before the SECURITY DEFINER function call.
--
-- Membership remains the authorization boundary; nothing else changes. The
-- policy keeps its name because owner => member still holds, so "member" is
-- still an accurate description of who it admits.
--
-- To roll back:
--   alter policy trips_select_member on public.trips
--     using (public.is_trip_member(id));

alter policy trips_select_member
  on public.trips
  using (
    owner_id = auth.uid()
    or public.is_trip_member(id)
  );
