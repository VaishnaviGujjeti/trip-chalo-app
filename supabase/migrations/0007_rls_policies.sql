-- 0007_rls_policies.sql
-- Enables RLS on all six tables and defines every access policy.
-- Membership (trip_members) is the sole gate for trip-scoped data.
-- Invitation status changes are NOT handled by client UPDATE — see the
-- accept/decline/revoke_invitation functions below.
-- Email identity checks use auth.jwt() ->> 'email' (from the verified
-- JWT claim) rather than querying auth.users directly.

-- Helper: can the current user see this trip's data at all.
-- SECURITY DEFINER + explicit search_path so this reads trip_members
-- directly, bypassing trip_members' own RLS, instead of recursing into it.
create or replace function public.is_trip_member(target_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.trip_members
    where trip_id = target_trip_id
      and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_owner(target_trip_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.trips
    where id = target_trip_id
      and owner_id = auth.uid()
  );
$$;

-- These two are evaluated inside RLS policies, which run as the querying
-- role (authenticated) — so authenticated needs EXECUTE to use them at all.
revoke execute on function public.is_trip_member(uuid) from public;
revoke execute on function public.is_trip_owner(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.invitations enable row level security;
alter table public.media enable row level security;
alter table public.messages enable row level security;

-- ============ profiles ============
create policy profiles_select_own
  on public.profiles for select
  using (id = auth.uid());

create policy profiles_update_own
  on public.profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());
-- No INSERT/DELETE policies: rows are created only by handle_new_user()
-- (SECURITY DEFINER, bypasses RLS) and never deleted directly by clients.

-- ============ trips ============
create policy trips_select_member
  on public.trips for select
  using (public.is_trip_member(id));

create policy trips_insert_own
  on public.trips for insert
  with check (owner_id = auth.uid());

create policy trips_update_owner
  on public.trips for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy trips_delete_owner
  on public.trips for delete
  using (owner_id = auth.uid());

-- ============ trip_members ============
create policy trip_members_select_member
  on public.trip_members for select
  using (public.is_trip_member(trip_id));

-- Deliberately NO insert policy: direct client INSERT is blocked entirely.
-- Rows are created only by add_trip_owner_as_member() (SECURITY DEFINER)
-- and accept_invitation() below — this is what stops a user from adding
-- themselves to an arbitrary trip.

-- A member may leave (delete their own row) ONLY if they are not the
-- owner. The owner may remove OTHER members' rows, but never their own
-- owner row. No ownership-transfer path exists yet, so the owner's
-- membership is undeletable by design until one does.
create policy trip_members_delete_self_or_owner
  on public.trip_members for delete
  using (
    (user_id = auth.uid() and role <> 'owner')
    or
    (public.is_trip_owner(trip_id) and user_id <> auth.uid())
  );

-- ============ invitations ============
-- SELECT and INSERT remain direct-client operations. UPDATE is removed
-- entirely — every status transition goes through a SECURITY DEFINER
-- function below, so identity fields (trip_id, inviter_id, invitee_email,
-- invitee_id) can never be touched by a client request of any kind.

create policy invitations_select_relevant
  on public.invitations for select
  using (
    inviter_id = auth.uid()
    or public.is_trip_owner(trip_id)
    or invitee_email = (auth.jwt() ->> 'email')
  );

create policy invitations_insert_member
  on public.invitations for insert
  with check (
    inviter_id = auth.uid()
    and public.is_trip_member(trip_id)
  );

-- Accept: validates the invite belongs to the caller (by JWT email), is
-- still pending, then resolves invitee_id server-side and creates the
-- trip_members row atomically — the only other path into trip_members
-- besides trip creation itself.
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

  if v_invitation.invitee_email is distinct from v_caller_email then
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

-- Decline: same identity check, no membership side effect.
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

  if v_invitation.invitee_email is distinct from v_caller_email then
    raise exception 'Invitation does not belong to the current user';
  end if;

  update public.invitations
  set status = 'declined', responded_at = now()
  where id = invitation_id;
end;
$$;

-- Revoke: only the inviter or the trip owner may cancel a pending invite.
create or replace function public.revoke_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invitation public.invitations;
begin
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

  if v_invitation.inviter_id <> auth.uid()
     and not public.is_trip_owner(v_invitation.trip_id) then
    raise exception 'Not authorized to revoke this invitation';
  end if;

  update public.invitations
  set status = 'revoked', responded_at = now()
  where id = invitation_id;
end;
$$;

-- EXECUTE privileges: authenticated only, explicit revoke-then-grant.
revoke execute on function public.accept_invitation(uuid) from public;
revoke execute on function public.decline_invitation(uuid) from public;
revoke execute on function public.revoke_invitation(uuid) from public;
grant execute on function public.accept_invitation(uuid) to authenticated;
grant execute on function public.decline_invitation(uuid) to authenticated;
grant execute on function public.revoke_invitation(uuid) to authenticated;

-- Trigger functions (handle_new_user, add_trip_owner_as_member) are never
-- called directly — only fired by triggers, which Postgres invokes
-- internally without checking the firing session's EXECUTE privilege.
-- Revoke PUBLIC execute on both as defense in depth.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.add_trip_owner_as_member() from public;

-- ============ media ============
-- No UPDATE policy: media rows are immutable via the Data API once
-- inserted. Correspondingly, 0008 grants no UPDATE on media either.
create policy media_select_member
  on public.media for select
  using (public.is_trip_member(trip_id));

create policy media_insert_member
  on public.media for insert
  with check (
    public.is_trip_member(trip_id)
    and uploader_id = auth.uid()
  );

create policy media_delete_uploader_or_owner
  on public.media for delete
  using (uploader_id = auth.uid() or public.is_trip_owner(trip_id));

-- ============ messages ============
create policy messages_select_member
  on public.messages for select
  using (public.is_trip_member(trip_id));

create policy messages_insert_member
  on public.messages for insert
  with check (
    public.is_trip_member(trip_id)
    and sender_id = auth.uid()
  );

create policy messages_update_sender
  on public.messages for update
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

create policy messages_delete_sender_or_owner
  on public.messages for delete
  using (sender_id = auth.uid() or public.is_trip_owner(trip_id));