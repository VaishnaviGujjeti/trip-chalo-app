"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/modules/auth/session";
import {
  isTripId,
  validateTripName,
  validateTripDescription,
  validateTripDates,
} from "./validation";

/**
 * The values the user submitted, echoed back so a server-side validation
 * error does not discard what they typed: React resets an uncontrolled form
 * after a Server Action completes, so the form re-renders from defaultValue.
 * Feeding these back as those defaults is what preserves the input.
 */
export type TripFormValues = {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
};

export type TripActionState = {
  error?: string;
  values?: TripFormValues;
};

function emptyToNull(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function readTripFormValues(formData: FormData): TripFormValues {
  return {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
  };
}

/**
 * Validation shared by create and edit — identical rules, and the server is
 * the authoritative check regardless of what the browser enforced.
 */
function validateTripFormValues(values: TripFormValues): string | null {
  const nameCheck = validateTripName(values.name);
  if (!nameCheck.valid) return nameCheck.error;

  const descriptionCheck = validateTripDescription(values.description);
  if (!descriptionCheck.valid) return descriptionCheck.error;

  const datesCheck = validateTripDates(values.startDate, values.endDate);
  if (!datesCheck.valid) return datesCheck.error;

  return null;
}

function tripColumnsFrom(values: TripFormValues) {
  return {
    name: values.name.trim(),
    description: emptyToNull(values.description),
    start_date: emptyToNull(values.startDate),
    end_date: emptyToNull(values.endDate),
  };
}

/**
 * Database failures are logged server-side and reported to the user as a
 * generic message. The log is what makes a failure diagnosable — the original
 * trip-creation RLS bug was invisible precisely because the real error was
 * swallowed here. Nothing from the error object reaches the browser: codes,
 * hints and constraint names describe the schema.
 */
function logDatabaseError(operation: string, error: PostgrestError): void {
  console.error(`[trips] ${operation} failed`, {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint,
  });
}

export async function createTripAction(
  _prevState: TripActionState,
  formData: FormData
): Promise<TripActionState> {
  const values = readTripFormValues(formData);

  const validationError = validateTripFormValues(values);
  if (validationError) return { error: validationError, values };

  // Defense in depth only — the (app) layout and the proxy both already gate
  // unauthenticated users out before this action is reachable. owner_id is
  // derived solely from the server-verified JWT, never from client input.
  const ownerId = await getCurrentUserId();
  if (!ownerId) {
    return { error: "You must be signed in to create a trip.", values };
  }

  const supabase = await createClient();

  // Reading the new row back requires the trips SELECT policy to admit it,
  // because RETURNING makes PostgreSQL check SELECT policies against the new
  // row. That is what migration 0009 fixes — the owner's trip_members row is
  // created by an AFTER INSERT trigger and so does not exist yet at this
  // point. trips_insert_own still enforces owner_id = auth.uid().
  const { data, error } = await supabase
    .from("trips")
    .insert({ owner_id: ownerId, ...tripColumnsFrom(values) })
    .select("id")
    .single();

  if (error || !data) {
    if (error) logDatabaseError("create", error);
    return { error: "Could not create the trip. Please try again.", values };
  }

  revalidatePath("/trips");
  redirect(`/trips/${data.id}`);
}

export async function updateTripAction(
  _prevState: TripActionState,
  formData: FormData
): Promise<TripActionState> {
  const tripId = String(formData.get("tripId") ?? "");
  const values = readTripFormValues(formData);

  if (!isTripId(tripId)) {
    return { error: "This trip could not be found.", values };
  }

  const validationError = validateTripFormValues(values);
  if (validationError) return { error: validationError, values };

  const supabase = await createClient();

  // Ownership is enforced by trips_update_owner (RLS, 0007) — a non-owner's
  // update matches zero rows rather than erroring, so an empty result is
  // treated as "not authorized" below. owner_id is never part of this update,
  // so ownership can never be reassigned through it.
  const { data, error } = await supabase
    .from("trips")
    .update(tripColumnsFrom(values))
    .eq("id", tripId)
    .select("id");

  if (error) {
    logDatabaseError("update", error);
    return { error: "Could not update the trip. Please try again.", values };
  }

  if (data.length === 0) {
    // Same message whether the trip does not exist, is not visible to this
    // caller, or is visible but owned by someone else — the three cases must
    // stay indistinguishable.
    return { error: "Only the trip owner can edit this trip.", values };
  }

  revalidatePath("/trips");
  revalidatePath(`/trips/${tripId}`);
  redirect(`/trips/${tripId}`);
}

export async function deleteTripAction(
  _prevState: TripActionState,
  formData: FormData
): Promise<TripActionState> {
  const tripId = String(formData.get("tripId") ?? "");

  if (!isTripId(tripId)) {
    return { error: "This trip could not be found." };
  }

  const supabase = await createClient();

  // Ownership is enforced by trips_delete_owner (RLS, 0007). Cascading deletes
  // on trip_members / invitations / media / messages happen at the database
  // level (0003–0006 foreign keys) — no application-level cleanup is needed or
  // attempted here. No archive path exists; this is a hard delete.
  const { data, error } = await supabase
    .from("trips")
    .delete()
    .eq("id", tripId)
    .select("id");

  if (error) {
    logDatabaseError("delete", error);
    return { error: "Could not delete the trip. Please try again." };
  }

  if (data.length === 0) {
    return { error: "Only the trip owner can delete this trip." };
  }

  revalidatePath("/trips");
  redirect("/trips");
}
