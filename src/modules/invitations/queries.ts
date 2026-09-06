import { createClient } from "@/lib/supabase/server";
import { getCurrentUserEmail } from "@/modules/auth/session";
import { isTripId } from "@/modules/trips/validation";
import { isInvitationId } from "./validation";

export type InvitationStatus = "pending" | "accepted" | "declined" | "revoked";

export type Invitation = {
  id: string;
  trip_id: string;
  inviter_id: string;
  invitee_email: string;
  invitee_id: string | null;
  status: InvitationStatus;
  created_at: string;
  responded_at: string | null;
};

/**
 * The four-field trip preview returned by get_invited_trip_preview() (0010).
 * Deliberately narrower than the Trip type in trips/queries.ts — no
 * description, owner_id, or timestamps, matching the approved Phase 5
 * product decision on what a pending invitee may see.
 */
export type InvitedTripPreview = {
  trip_id: string;
  name: string;
  start_date: string | null;
  end_date: string | null;
};

const INVITATION_COLUMNS =
  "id, trip_id, inviter_id, invitee_email, invitee_id, status, created_at, responded_at";

/**
 * Pending invitations addressed to the current user, across all trips —
 * the data behind a "your invitations" inbox.
 *
 * invitations_select_relevant (0007) already restricts SELECT to rows where
 * the caller is the inviter, the trip owner, OR the invitee — a strict
 * superset of "invitations addressed to me." The explicit invitee_email
 * filter below is what narrows that down to this specific view; without
 * it, invitations the caller sent (as an inviter or owner) would be mixed
 * in with invitations sent to them. RLS is the authorization ceiling here,
 * not the intended result set for this screen.
 *
 * Returns an empty list rather than throwing if there is no verified email
 * claim — defense in depth only, matching the pattern already used in
 * trips/actions.ts: the (app) layout and proxy already gate unauthenticated
 * access before this is reachable.
 */
export async function listMyPendingInvitations(): Promise<Invitation[]> {
  const email = await getCurrentUserEmail();
  if (!email) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .select(INVITATION_COLUMNS)
    .eq("invitee_email", email)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invitations] listMyPendingInvitations failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load your invitations");
  }

  return data;
}

/**
 * Every invitation for a trip that the caller is allowed to see.
 *
 * invitations_select_relevant (0007) restricts this to the trip owner
 * (sees every invitation for the trip) or an individual inviter (sees only
 * the ones they personally sent) — there is no broader "any member sees
 * every invitation for this trip" visibility, by design (0007's own
 * comment: SELECT and INSERT remain direct-client operations, scoped this
 * way deliberately). A non-owner member who hasn't sent any invites will
 * get an empty list here, which is the correct, RLS-enforced result, not
 * a bug.
 *
 * Returns every status, not just pending — callers decide what to filter
 * or display; this mirrors listMyTrips' "no app-level filtering, RLS is
 * the boundary" stance (trips/queries.ts).
 *
 * Malformed trip ids return an empty list rather than reaching the
 * database, matching the project's not-found invariant (isTripId comment,
 * trips/validation.ts): a well-formedness check, not an authorization one.
 */
export async function listInvitationsForTrip(tripId: string): Promise<Invitation[]> {
  if (!isTripId(tripId)) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("invitations")
    .select(INVITATION_COLUMNS)
    .eq("trip_id", tripId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[invitations] listInvitationsForTrip failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load invitations for this trip");
  }

  return data;
}

/**
 * The four-field trip preview for a pending invitation addressed to the
 * current user, via get_invited_trip_preview() (0010) — the only path by
 * which a pending invitee can see anything about the trip they've been
 * invited to; there is no direct SELECT grant on trips for them.
 *
 * Returns null uniformly for every rejection reason (invitation not found,
 * not pending, or addressed to a different email) rather than distinguishing
 * them — that indistinguishability is enforced server-side (0010) and is
 * deliberately preserved here rather than papered over with a more specific
 * client-side error, so a caller can never learn more about an invitation
 * than the database is willing to reveal.
 *
 * Uses maybeSingle(): zero matching rows is an expected, non-error outcome
 * (same rationale as getTripById, trips/queries.ts), not a query failure.
 * Malformed invitation ids are rejected before the RPC call for the same
 * well-formedness reason isTripId is checked in getTripById.
 */
export async function getInvitedTripPreview(
  invitationId: string
): Promise<InvitedTripPreview | null> {
  if (!isInvitationId(invitationId)) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .rpc("get_invited_trip_preview", { invitation_id: invitationId })
    .maybeSingle();

  if (error) {
    console.error("[invitations] getInvitedTripPreview failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load invitation preview");
  }

  // Without generated Database types, .rpc()'s result type resolves to
  // `unknown` (unlike the plain .from() calls elsewhere in this codebase,
  // which resolve to `any` and so don't need this). This assertion is the
  // same trust-the-database-shape boundary every other query function in
  // this module already relies on implicitly; verified against a live
  // instance of get_invited_trip_preview() to actually return this shape.
  return data as InvitedTripPreview | null;
}
