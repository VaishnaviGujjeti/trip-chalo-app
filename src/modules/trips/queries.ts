import { createClient } from "@/lib/supabase/server";
import { isTripId } from "./validation";

export type Trip = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
};

const TRIP_COLUMNS =
  "id, owner_id, name, description, start_date, end_date, created_at, updated_at";

/**
 * Every trip the caller can see. No app-level filtering is applied —
 * `trips_select_member` (0007, amended in 0009) already restricts rows to
 * trips the caller is a member of; RLS is the authorization boundary here,
 * not this query.
 *
 * Throws on failure so the trips error boundary renders. The underlying
 * message is logged server-side rather than attached to the thrown error:
 * Next.js redacts server error messages in production, but there is no reason
 * to put database detail on that path in development either.
 */
export async function listMyTrips(): Promise<Trip[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[trips] list failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load trips");
  }

  return data;
}

/**
 * A single trip by id, or null if it doesn't exist OR the caller is not a
 * member. Deliberately does not distinguish between the two — a non-member
 * requesting a trip must see the same result as a nonexistent id, per the
 * project's not-found behavior invariant. Callers render null as a generic
 * not-found.
 *
 * A genuine query failure is a different thing from "no such trip" and is
 * rethrown rather than flattened into null, so a transient database problem
 * surfaces as an error instead of a misleading "this trip doesn't exist".
 * Malformed ids are rejected up front so they stay in the not-found case.
 *
 * Uses maybeSingle() rather than single(): RLS returning zero rows for a
 * non-member is an expected, non-error outcome, not a query failure.
 */
export async function getTripById(tripId: string): Promise<Trip | null> {
  if (!isTripId(tripId)) {
    return null;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trips")
    .select(TRIP_COLUMNS)
    .eq("id", tripId)
    .maybeSingle();

  if (error) {
    console.error("[trips] get failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load trip");
  }

  return data;
}
