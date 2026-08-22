-- 0004_invitations.sql
-- Trip invitations, targeted by email since the invitee may not have
-- an account yet. invitee_id resolves once/if they sign up and accept,
-- via accept_invitation() in 0007 — never trusted from client input.

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  inviter_id uuid not null references public.profiles (id),
  invitee_email text not null,
  invitee_id uuid references public.profiles (id),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'revoked')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);

comment on table public.invitations is
  'Email-targeted trip invites. invitee_id fills in at accept-time by matching (auth.jwt() ->> ''email''), never trusted from client input. Status changes only via SECURITY DEFINER functions in 0007 — no client UPDATE path exists.';

create index invitations_invitee_email_idx on public.invitations (invitee_email);

-- Only one active (pending) invite per trip+email at a time.
-- Declined/revoked invites don't block a fresh invite to the same address.
create unique index invitations_unique_pending
  on public.invitations (trip_id, invitee_email)
  where status = 'pending';