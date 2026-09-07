"use server";

import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/modules/auth/session";
import { isTripId } from "@/modules/trips/validation";
import {
  isInvitationId,
  validateInviteeEmail,
  normalizeInviteeEmail,
} from "./validation";

export type InvitationActionState = {
  error?: string;
  success?: string;
  email?: string;
};

/**
 * Database failures are logged server-side and reported to the user as a
 * generic message — same convention as trips/actions.ts. Nothing from the
 * error object reaches the browser.
 */
function logDatabaseError(operation: string, error: PostgrestError): void {
  console.error(`[invitations] ${operation} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * Any current trip member may invite — enforced entirely by
 * invitations_insert_member (0007: inviter_id = auth.uid() AND
 * is_trip_member(trip_id)), not by an application-level ownership check.
 * inviter_id is always the server-derived caller id, never a client-supplied
 * field, so a request can't forge who the inviter is.
 *
 * A non-member's insert is rejected by RLS as 42501, not a distinguishable
 * "you're not a member" error from Postgres — that's mapped to a specific
 * message below rather than left as a raw RLS error string.
 */
export async function inviteMemberAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const tripId = String(formData.get("tripId") ?? "");
  const rawEmail = String(formData.get("email") ?? "");

  if (!isTripId(tripId)) {
    return { error: "This trip could not be found.", email: rawEmail };
  }

  const emailCheck = validateInviteeEmail(rawEmail);
  if (!emailCheck.valid) {
    return { error: emailCheck.error, email: rawEmail };
  }

  const inviterId = await getCurrentUserId();
  if (!inviterId) {
    return { error: "You must be signed in to invite someone.", email: rawEmail };
  }

  // Normalized here (not just client-side) so what's written always matches
  // what accept/decline/get_invited_trip_preview later compare against
  // (0011) — though the invitations_normalize_invitee_email trigger (0011)
  // is the authoritative guarantee regardless of what this action sends.
  const normalizedEmail = normalizeInviteeEmail(rawEmail);
  const supabase = await createClient();

  const { error } = await supabase.from("invitations").insert({
    trip_id: tripId,
    inviter_id: inviterId,
    invitee_email: normalizedEmail,
  });

  if (error) {
    // 23505 = unique_violation. invitations_unique_pending (0004: one
    // active pending invite per trip+email) is the only constraint this
    // insert can hit — checked explicitly by name so an unrelated future
    // 23505 (e.g. a primary key collision) isn't silently mislabeled as
    // "already invited".
    if (error.code === "23505" && error.message.includes("invitations_unique_pending")) {
      return {
        error: "This person already has a pending invitation to this trip.",
        email: rawEmail,
      };
    }

    // 42501 = insufficient_privilege, i.e. RLS rejected the insert because
    // the caller isn't a member of this trip (is_trip_member(trip_id) was
    // false). Mapped to a specific message rather than falling through to
    // the generic one, since it's a distinct, expected condition.
    if (error.code === "42501") {
      return {
        error: "You must be a member of this trip to invite others.",
        email: rawEmail,
      };
    }

    logDatabaseError("invite", error);
    return { error: "Could not send the invitation. Please try again.", email: rawEmail };
  }

  // No existing page currently reads invitation data, so there is nothing
  // to revalidate yet — the future invitations/member-list UI batch should
  // add the appropriate revalidatePath call here.
  return { success: "Invitation sent." };
}

/**
 * Maps the known business-error messages raised by accept_invitation,
 * decline_invitation, and revoke_invitation (0007/0011) to safe,
 * operation-appropriate user-facing text. Anything unrecognized is logged
 * server-side and reported generically — this function never lets a raw
 * Postgres error string (or an unmapped one) reach the browser.
 */
function mapInvitationRpcError(
  operation: "accept" | "decline" | "revoke",
  error: PostgrestError
): string {
  const message = error.message;

  if (message.includes("Invitation not found")) {
    return "This invitation no longer exists.";
  }
  if (message.includes("Invitation is not pending")) {
    return "This invitation has already been responded to.";
  }
  if (message.includes("Invitation does not belong to the current user")) {
    return "This invitation isn't addressed to you.";
  }
  if (message.includes("Not authorized to revoke this invitation")) {
    return "Only the inviter or the trip owner can revoke this invitation.";
  }

  logDatabaseError(operation, error);
  return "Could not process this invitation. Please try again.";
}

/**
 * Delegates entirely to accept_invitation (0007, email-comparison hardened
 * in 0011) — a SECURITY DEFINER function that independently re-derives the
 * caller's identity from their verified JWT email and validates invitation
 * status itself. This action does not re-implement any of that: it passes
 * only the invitation id and reports whatever the function decides.
 */
export async function acceptInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!isInvitationId(invitationId)) {
    return { error: "This invitation could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invitation", {
    invitation_id: invitationId,
  });

  if (error) {
    return { error: mapInvitationRpcError("accept", error) };
  }

  // Accepting creates a trip_members row, which changes what listMyTrips()
  // returns — the one currently-existing page this can actually go stale.
  revalidatePath("/trips");
  return { success: "You've joined the trip." };
}

/**
 * Delegates entirely to decline_invitation (0007/0011) — same identity and
 * status validation as accept, no membership side effect.
 */
export async function declineInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!isInvitationId(invitationId)) {
    return { error: "This invitation could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("decline_invitation", {
    invitation_id: invitationId,
  });

  if (error) {
    return { error: mapInvitationRpcError("decline", error) };
  }

  // No existing page currently displays invitation status, so there is
  // nothing to revalidate yet.
  return { success: "Invitation declined." };
}

/**
 * Delegates entirely to revoke_invitation (0007) — authorization (inviter
 * or trip owner) is decided inside the function against the invitation's
 * own stored trip_id/inviter_id, not from anything this action supplies.
 */
export async function revokeInvitationAction(
  _prevState: InvitationActionState,
  formData: FormData
): Promise<InvitationActionState> {
  const invitationId = String(formData.get("invitationId") ?? "");

  if (!isInvitationId(invitationId)) {
    return { error: "This invitation could not be found." };
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("revoke_invitation", {
    invitation_id: invitationId,
  });

  if (error) {
    return { error: mapInvitationRpcError("revoke", error) };
  }

  // No existing page currently lists a trip's invitations, so there is
  // nothing to revalidate yet.
  return { success: "Invitation revoked." };
}