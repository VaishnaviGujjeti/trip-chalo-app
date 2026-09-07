"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/modules/auth/session";
import { isTripId } from "@/modules/trips/validation";
import type { TripMemberRole } from "./queries";

export type MembershipActionState = {
  error?: string;
};

/**
 * Shape of the two columns read from the caller's own trip_members row.
 * Without generated Database types, the client (created without a Database
 * generic — see lib/supabase/server.ts) infers `.select(...)` results as
 * `any`; this names the expected runtime shape explicitly rather than
 * comparing against an untyped value, matching the pattern already used in
 * memberships/queries.ts (TripMemberRow) for the same underlying reason.
 * Reuses the existing TripMemberRole union instead of re-declaring it.
 */
type CallerMembershipRow = { id: string; role: TripMemberRole };

function logDatabaseError(operation: string, error: PostgrestError): void {
  console.error(`[memberships] ${operation} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

/**
 * Lets a member remove themselves from a trip.
 *
 * Reads the caller's own trip_members row first rather than issuing the
 * delete and inferring intent from the affected-row count. That matters
 * because trip_members_delete_self_or_owner (0007) makes a delete on the
 * owner's own row match zero rows in exactly the same way a delete by a
 * non-member would (neither disjunct of that policy admits it) — a bare
 * "0 rows affected" genuinely cannot tell those two cases apart, so this
 * distinguishes them beforehand with a read instead of guessing after the
 * fact.
 *
 * The read is itself safe under RLS: trip_members_select_member admits it
 * because is_trip_member(trip_id) is true for the caller exactly when a
 * trip_members row with user_id = caller exists for that trip — for this
 * specific query shape (filtered to the caller's own user_id), "row hidden
 * by RLS" and "row doesn't exist" are the same condition, so there is no
 * ambiguity in treating a null result as "not a member."
 *
 * role cannot change between this read and the delete below: 0007 defines
 * no RLS UPDATE policy for trip_members at all, so despite 0008 granting
 * table-level UPDATE, Postgres's RLS default-deny denies every UPDATE on
 * this table regardless of caller — there is no role-flip race window.
 *
 * This introduces no new authorization surface — the actual removal is
 * still governed entirely by trip_members_delete_self_or_owner, and every
 * filter below is against the server-derived caller id, never a
 * client-supplied one. No owner-removal or ownership-transfer path is
 * added here: an owner is told plainly that leaving isn't available yet.
 */
export async function leaveTripAction(
  _prevState: MembershipActionState,
  formData: FormData
): Promise<MembershipActionState> {
  const tripId = String(formData.get("tripId") ?? "");

  if (!isTripId(tripId)) {
    return { error: "This trip could not be found." };
  }

  const callerId = await getCurrentUserId();
  if (!callerId) {
    return { error: "You must be signed in to leave a trip." };
  }

  const supabase = await createClient();

  const { data, error: lookupError } = await supabase
    .from("trip_members")
    .select("id, role")
    .eq("trip_id", tripId)
    .eq("user_id", callerId)
    .maybeSingle();

  if (lookupError) {
    logDatabaseError("leave (lookup)", lookupError);
    return { error: "Could not leave the trip. Please try again." };
  }

  const membership = data as CallerMembershipRow | null;

  if (!membership) {
    return { error: "You are not a member of this trip." };
  }

  if (membership.role === "owner") {
    return {
      error:
        "Trip owners can't leave their own trip yet — ownership transfer isn't available.",
    };
  }

  const { error: deleteError } = await supabase
    .from("trip_members")
    .delete()
    .eq("trip_id", tripId)
    .eq("user_id", callerId);

  if (deleteError) {
    logDatabaseError("leave", deleteError);
    return { error: "Could not leave the trip. Please try again." };
  }

  // Leaving removes a row from what listMyTrips() returns for this caller.
  revalidatePath("/trips");
  redirect("/trips");
}