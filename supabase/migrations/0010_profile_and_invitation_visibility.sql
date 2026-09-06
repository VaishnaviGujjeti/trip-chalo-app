-- 0010_profile_and_invitation_visibility.sql
-- Phase 5 (Membership & Invitations) — two additive read-visibility fixes
-- identified during the Phase 5 design/security review. Neither changes any
-- existing policy, grant, or function; both are new capabilities layered on
-- top of the existing Phase 2 authorization model.
--
-- Gap A: profiles_select_own (0007) restricts every profile row to its own
-- owner. That is correct for strangers, but once two users share a trip
-- (trip_members), each needs to resolve the other's user_id to a
-- display_name for member lists and invite history — and, in later phases,
-- media/message attribution. No such policy exists today.
--
-- Gap B: trips_select_member (0009) only admits the trip owner or an
-- existing trip_members row. A user with a pending invitation is neither,
-- so the /invitations UI has no way to show them what trip they are being
-- invited to before they decide whether to accept.
--
-- Gap B is intentionally NOT solved with a trips SELECT policy. A row-level
-- policy would grant the invitee the entire trips row — including
-- description and owner_id — through every future query path that selects
-- a trip by id, not just this one preview screen. Per product decision, a
-- pending invitee should see only id, name, start_date, end_date. That
-- column-level restriction is not expressible as a table RLS policy (RLS
-- is row-level, not column-level), so it is implemented instead as a
-- narrow SECURITY DEFINER function — the same pattern already used by
-- accept_invitation / decline_invitation / revoke_invitation in 0007 —
-- that independently re-validates the caller's identity against the
-- invitation before returning anything, and returns only the four agreed
-- columns. trips RLS and grants are unchanged by this migration.

-- ============ Gap A: profiles visible to co-members ============
-- Read path: the subquery scans trip_members as the calling `authenticated`
-- role, which re-applies trip_members_select_member (is_trip_member(trip_id))
-- to that scan. is_trip_member() is SECURITY DEFINER (0007) and reads
-- trip_members directly, bypassing its own RLS rather than recursing into
-- it — the same bypass mechanism already relied on elsewhere in this
-- schema, so this introduces no new recursion.
--
-- What becomes visible: profiles.id = X becomes readable to the caller only
-- if X has a trip_members row for some trip where the caller is ALSO a
-- member. The caller already knows every user_id in their own trips via
-- trip_members directly (that table's own SELECT policy already admits
-- it) — this policy only resolves an already-visible user_id to a
-- display_name. It creates no path to learn about a user who shares no
-- trip with the caller, and profiles carries no data more sensitive than
-- display_name / avatar_url (0001: "display data only").
create policy profiles_select_trip_member
  on public.profiles for select
  using (
    exists (
      select 1
      from public.trip_members tm
      where tm.user_id = profiles.id
        and public.is_trip_member(tm.trip_id)
    )
  );

-- ============ Gap B: narrow invitation preview ============
-- Deliberately NOT a trips policy — see header. Returns exactly four
-- columns; description, owner_id, and all other trip columns are never
-- selected by this function, so they cannot leak through it regardless of
-- caller.
--
-- Identity check: invitation_id is client-supplied and therefore
-- untrusted. The function re-derives eligibility from the caller's own
-- verified JWT email (auth.jwt() ->> 'email'), matched against the
-- invitation's invitee_email, and requires status = 'pending' — the same
-- validation shape as accept_invitation/decline_invitation (0007).
--
-- Every rejection path (invitation not found, not pending, or addressed to
-- a different email) returns zero rows rather than raising a distinct
-- error. This is deliberate: a caller cannot distinguish "no such
-- invitation" from "not yours" from "already resolved," so the function
-- cannot be used as an oracle to probe for the existence of other users'
-- invitations. This mirrors the project's existing invariant for trip ids
-- (isTripId / getTripById: "a caller can never distinguish 'no such trip'
-- from 'not yours'").
--
-- Enumeration check: a pending invitation matching the caller's email can
-- only exist because a real, current trip member created it
-- (invitations_insert_member requires inviter_id = auth.uid() AND
-- is_trip_member(trip_id), 0007) — there is no self-service path for a
-- user to fabricate a pending invitation addressed to themselves in order
-- to probe for trips.
--
-- SECURITY DEFINER + search_path = '' + fully-qualified names, matching
-- every other privileged function in this schema. Because this function
-- resolves the trip row itself (rather than the caller's own SELECT
-- touching trips), the invitee's session is never granted any direct
-- SELECT capability on public.trips — trips RLS and grants remain exactly
-- as amended by 0009, untouched by this migration.
create or replace function public.get_invited_trip_preview(invitation_id uuid)
returns table (
  trip_id uuid,
  name text,
  start_date date,
  end_date date
)
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_invitation public.invitations;
  v_caller_email text;
begin
  v_caller_email := auth.jwt() ->> 'email';

  select * into v_invitation
  from public.invitations
  where id = invitation_id;

  if v_invitation is null then
    return;
  end if;

  if v_invitation.status <> 'pending' then
    return;
  end if;

  if v_invitation.invitee_email is distinct from v_caller_email then
    return;
  end if;

  return query
    select t.id, t.name, t.start_date, t.end_date
    from public.trips t
    where t.id = v_invitation.trip_id;
end;
$$;

-- EXECUTE privileges: authenticated only, explicit revoke-then-grant —
-- matches the pattern for accept_invitation/decline_invitation/
-- revoke_invitation in 0007.
revoke execute on function public.get_invited_trip_preview(uuid) from public;
grant execute on function public.get_invited_trip_preview(uuid) to authenticated;
