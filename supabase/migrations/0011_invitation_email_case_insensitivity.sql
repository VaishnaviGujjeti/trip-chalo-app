-- 0011_invitation_email_case_insensitivity.sql
-- Fixes a confirmed bug in the invitation email-identity flow: an invitee
-- whose invitation was stored with different casing than their actual
-- account email could not see, preview, or accept it.
--
-- ROOT CAUSE (confirmed against the real GoTrue/Supabase Auth source,
-- github.com/supabase/auth, and reproduced end-to-end against a live
-- Postgres + PostgREST instance before this migration existed):
--
--   * Every self-service account-creation and email-change path in GoTrue
--     (POST /signup and PUT /user) runs the incoming address through its
--     own validateEmail(), which lowercases it, and models.NewUser() also
--     lowercases independently — so a real user who types
--     "Phase5.MixedCase@Example.com" at signup ends up with
--     auth.users.email = "phase5.mixedcase@example.com", and every JWT
--     issued to them carries that same lowercase value in the `email`
--     claim (internal/tokens/service.go populates AccessTokenClaims.Email
--     directly from user.GetEmail(), with no further transformation).
--
--   * invitee_email (0004), however, is stored as whatever string the
--     inviter typed — with no normalization applied anywhere before this
--     migration. normalizeInviteeEmail() existed in application code
--     (src/modules/invitations/validation.ts) but was not yet wired into
--     any server action, and even once wired, an application-layer-only
--     fix would not protect every current and future write path into this
--     column.
--
--   * accept_invitation, decline_invitation, get_invited_trip_preview
--     (0007, 0010), and the invitations_select_relevant policy (0007) all
--     compare invitee_email against auth.jwt() ->> 'email' with plain,
--     case-sensitive equality. If an inviter typed the recipient's email
--     in different casing than their actual (lowercase) account email,
--     every one of those comparisons fails.
--
--   * Reproduced directly: inviting "Phase5.MixedCase@Example.com" and
--     then attempting to view, preview, or accept that invitation as the
--     real account (JWT email "phase5.mixedcase@example.com") failed on
--     all three paths — the SELECT returned zero rows, the preview RPC
--     returned zero rows, and accept_invitation raised "Invitation does
--     not belong to the current user."
--
-- FIX, IN TWO COMPLEMENTARY PARTS
--
-- Part 1 — canonicalize at write time. A BEFORE INSERT trigger lowercases
-- and trims invitee_email before the row (and the invitations_unique_pending
-- partial unique index, and the INSERT policy's WITH CHECK) ever see it.
-- This is the authoritative fix for every current and future write path
-- into this column, application code included — it cannot be bypassed by
-- forgetting to call a client-side normalizer, and it also closes a
-- separate latent bug the client-side function alone could never fix: two
-- pending invitations to the same trip differing only in casing (e.g.
-- "a@x.com" and "A@x.com") would otherwise both satisfy
-- invitations_unique_pending as distinct strings, defeating its one-
-- active-invite-per-recipient invariant.
--
-- Part 2 — defense in depth on the read/compare side. The one confirmed
-- gap in GoTrue itself is its admin API's user-email-update path
-- (PUT /admin/users/:id), which sets auth.users.email verbatim without
-- lowercasing (internal/api/admin.go calls user.SetEmail() directly,
-- bypassing the validateEmail() normalization every self-service path
-- goes through). This project's current code never calls the admin API,
-- so this does not affect any path in use today — but the four places
-- that read auth.jwt() ->> 'email' for a comparison are updated to also
-- lower() that side, so a correctly-cased, normalized invitee_email would
-- still match even a hypothetical future non-lowercase JWT email, rather
-- than depending permanently on an assumption about GoTrue's internal
-- behavior on a code path this project doesn't currently use.
--
-- Neither part changes what is authorized — accept_invitation,
-- decline_invitation, and get_invited_trip_preview still require exact
-- identity match (now case-insensitive, which is the semantically correct
-- behavior for email addresses) and correct status; revoke_invitation does
-- not compare email at all and is untouched. RLS remains exactly as
-- restrictive as before, only case-insensitive where email is the
-- comparison key.
--
-- CORRECTION: an earlier version of this migration's backfill normalized
-- invitee_email in a single blanket UPDATE. That is unsafe — if two
-- PENDING invitations to the same trip already differed only by case, the
-- backfill would itself violate invitations_unique_pending and the
-- migration would fail. The backfill below resolves any such pending
-- duplicates to a single survivor first (see Step 1), then normalizes
-- (Step 2). The trigger also now covers UPDATE as well as INSERT, so
-- normalization is guaranteed for every write path to this column, not
-- only the one currently reachable through the Data API.

-- ============ Part 1: normalize invitee_email at write time ============
create or replace function public.normalize_invitee_email()
returns trigger
language plpgsql
as $$
begin
  new.invitee_email := lower(trim(new.invitee_email));
  return new;
end;
$$;

-- Fires on both INSERT and UPDATE: no client-facing UPDATE grant exists on
-- invitee_email today (0008: authenticated has SELECT+INSERT only on
-- invitations), so INSERT is the only reachable path right now — but
-- covering UPDATE too means this guarantee holds for any future write path
-- (a later migration, an admin tool, a widened grant) without requiring
-- this trigger to be revisited. The function is idempotent (lower(trim(x))
-- on an already-normalized x is a no-op), so there is no cost to covering
-- both.
create trigger invitations_normalize_invitee_email
  before insert or update on public.invitations
  for each row
  execute function public.normalize_invitee_email();

-- ------------------------------------------------------------------
-- Backfill existing rows into canonical form — done in two ordered steps
-- because a single blanket UPDATE can itself violate
-- invitations_unique_pending: if two PENDING invitations for the same
-- trip already differ only by case (e.g. "Test@x.com" and "test@x.com"),
-- normalizing both in one statement makes them collide on the same
-- (trip_id, invitee_email) the partial unique index protects, and the
-- migration would abort. This is exactly the invariant that unique index
-- exists to enforce, so pending duplicates must be resolved to a single
-- survivor BEFORE the blanket normalization runs, not as a side effect of it.
--
-- Step 1: for every (trip_id, normalized invitee_email) group that
-- currently has more than one PENDING row, keep exactly one and supersede
-- the rest. The tie-break is deterministic: most recently created wins
-- (created_at desc), id desc as a final tie-break for the (extremely
-- unlikely) case of identical timestamps. Superseded rows are marked
-- 'revoked' with responded_at set — an audit-preserving choice consistent
-- with how revoke_invitation already represents "no longer active,
-- superseded by later action" elsewhere in this schema, rather than
-- silently deleting history. Only PENDING rows are touched: accepted/
-- declined/revoked rows are already invisible to invitations_unique_pending
-- regardless of what their invitee_email normalizes to, so they need no
-- deduplication at all.
with ranked_pending as (
  select
    id,
    row_number() over (
      partition by trip_id, lower(trim(invitee_email))
      order by created_at desc, id desc
    ) as rn
  from public.invitations
  where status = 'pending'
)
update public.invitations inv
set status = 'revoked',
    responded_at = now()
from ranked_pending r
where inv.id = r.id
  and r.rn > 1;

-- Step 2: now safe — at most one PENDING row remains per (trip_id,
-- normalized invitee_email) group, so this can no longer collide with
-- invitations_unique_pending.
update public.invitations
set invitee_email = lower(trim(invitee_email))
where invitee_email <> lower(trim(invitee_email));

-- ============ Part 2: case-insensitive comparison, defense in depth ============

-- invitations_select_relevant (0007): only the invitee-email disjunct changes.
alter policy invitations_select_relevant
  on public.invitations
  using (
    inviter_id = auth.uid()
    or public.is_trip_owner(trip_id)
    or lower(invitee_email) = lower(auth.jwt() ->> 'email')
  );

-- accept_invitation (0007): identical to the original except the identity
-- check is now case-insensitive.
create or replace function public.accept_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
  v_caller_email text;
begin
  v_caller_email := auth.jwt() ->> 'email';

  select * into v_invitation
  from public.invitations
  where id = invitation_id
  for update;

  if v_invitation is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  if lower(v_invitation.invitee_email) is distinct from lower(v_caller_email) then
    raise exception 'Invitation does not belong to the current user';
  end if;

  update public.invitations
  set status = 'accepted',
      invitee_id = auth.uid(),
      responded_at = now()
  where id = invitation_id;

  insert into public.trip_members (trip_id, user_id, role)
  values (v_invitation.trip_id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do nothing;
end;
$$;

-- decline_invitation (0007): same single-line change as accept_invitation.
create or replace function public.decline_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
  v_caller_email text;
begin
  v_caller_email := auth.jwt() ->> 'email';

  select * into v_invitation
  from public.invitations
  where id = invitation_id
  for update;

  if v_invitation is null then
    raise exception 'Invitation not found';
  end if;

  if v_invitation.status <> 'pending' then
    raise exception 'Invitation is not pending';
  end if;

  if lower(v_invitation.invitee_email) is distinct from lower(v_caller_email) then
    raise exception 'Invitation does not belong to the current user';
  end if;

  update public.invitations
  set status = 'declined', responded_at = now()
  where id = invitation_id;
end;
$$;

-- get_invited_trip_preview (0010): same single-line change, everything else
-- (the empty-result-on-every-rejection-reason invariant, the four-column
-- return shape) is unchanged.
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

  if lower(v_invitation.invitee_email) is distinct from lower(v_caller_email) then
    return;
  end if;

  return query
    select t.id, t.name, t.start_date, t.end_date
    from public.trips t
    where t.id = v_invitation.trip_id;
end;
$$;

-- No grant/EXECUTE changes: accept_invitation, decline_invitation, and
-- get_invited_trip_preview keep exactly the authenticated-only EXECUTE
-- grants already set in 0007/0010. revoke_invitation is untouched (no
-- email comparison exists in it).
